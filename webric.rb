require 'em-websocket'
require 'json'
require 'cinch'
require 'gemoji'

require_relative 'lib/filters.rb'
require_relative 'lib/plugins/errors.rb'
require_relative 'lib/plugins/connect.rb'
require_relative 'lib/plugins/messages.rb'
require_relative 'lib/plugins/join.rb'
require_relative 'lib/commands.rb'

module WebRic

  class Client
    include WebRic::Commands # Include commands that are parsed from JS
    attr_accessor :nick, :server, :port, :user_info, :peer_ip, :peer_port
    attr_reader :channels, :bot
    def initialize(ws)
      @nick = "WebRic#{Time.new.to_i}" # Gotta have a name
      @channels ||= []  # List of channels for this websocket connection
      @port ||= 6667 # Default port
      @server ||= "localhost" # Default Server

      @ws = ws

    end

    # Setup is called after JS client connects to WebSocket
    def setup(options)
      @nick = options['nick'] if options['nick']
      @server = options['server'] if options['server']
      @port = options['port'].to_i if options['port']
      connect
    end

    # Connect to IRC
    def connect
      # Cinch plugins that handle IRC messages, etc.
      plugins = [WebRic::Plugin::Errors, WebRic::Plugin::Connect,WebRic::Plugin::Messages,WebRic::Plugin::Join]
      @bot = Cinch::Bot.new

      # Configure Cinch
      @bot.configure do |c|
        c.message_split_end = ""
        c.message_split_start = ""
        c.server = @server
        c.nick = @nick
        c.port = @port
        c.channels = ["#WebRicIRC"]
        c.plugins.plugins = plugins
        plugins.each do |plug|
          c.plugins.options[plug] = {webclient: self}
        end
      end

      # Start Cinch in thread to prevent blocking
      EM.defer{
        @bot.start
      }

    end

    # Helper method to provide direct access to websocket
    def socket
      @ws
    end

    # Send list of users in channel to websocket
    def names(channel)
      target=@bot.Channel(channel)
      users = target.users.map { |u,m| "#{'@' if m.include? "o" }#{'+' if m.include? "v"}#{u}"}.sort
      send_command("names",users: users, channel: channel)
    end

    # Send errors, notices, etc to client
    def systemmsg(head, message)
      send_command(:systemmsg, head: head, message: message )
    end

    # Send channel messages / private messages
    def privmsg(channel,nick,message)
      send_command(:privmsg, nick: nick, channel: channel , message: "#{Filter.new(message)}")
    end

    # Send channel messages / private messages
    def action(channel,nick,message)
      send_command(:action, nick: nick, channel: channel , message: "#{Filter.new(message)}")
    end

    # Send a command to the web client.
    def send_command(command,args)
      puts "Send Command #{command}: #{args}"
      send_socket({command: command, args: args}.to_json)
    end

    private
    # wrapper methods
    def send_socket(msg)
      @ws.send(msg)
    end
  end
end

## Setup eventmachine to handle websocket connections
EventMachine.run do
  @clients = Hash.new
  EM::WebSocket.run(:host => "0.0.0.0", :port => 8383) do |ws|

    # Triggered when JS client connects to websocket
    ws.onopen do |handshake|
      peer_port, peer_ip = Socket.unpack_sockaddr_in(ws.get_peername)
      puts "Connected: #{peer_ip}:#{peer_port}"
      client = WebRic::Client.new(ws)
      client.peer_ip = peer_ip
      client.peer_port = peer_port
      @clients[ws] = client
      client.systemmsg("WebRic","Welcome to WebRic!")
    end

    # Triggered when JS client connection is lost
    ws.onclose do
      puts "Disconnected: #{@clients[ws].peer_ip}:#{@clients[ws].peer_port}"
      @clients[ws].bot.quit("WebRic - Lost Web Client")
      @clients[ws].systemmsg("Disconnected.", "You have been disconnected.")
      @clients.delete(ws)
    end

    # Triggered when any data is sent from JS client
    ws.onmessage do |msg|
      puts "Received Message: #{msg}"
      @clients[ws].parse_command(JSON.parse(msg))
    end
  end
end if __FILE__ == $0
