require 'em-websocket'
require 'json'
require 'cinch'
require 'gemoji'

require_relative 'lib/filters.rb'
require_relative 'lib/plugins/connect.rb'
require_relative 'lib/plugins/messages.rb'
require_relative 'lib/plugins/join.rb'
require_relative 'lib/commands.rb'

module WebRic

  class Client
    include WebRic::Commands
    attr_accessor :nick, :server, :port, :user_info, :peer_ip, :peer_port
    attr_reader :channels, :bot
    def initialize(ws)
      @nick = "WebRic#{Time.new.to_i}"
      @channels ||= []
      @port ||= 6667
      @server ||= "localhost"

      @ws = ws

    end

    def setup(options)
      @nick = options['nick'] if options['nick']
      @server = options['server'] if options['server']
      @port = options['port'] if options['port']
      connect
    end

    def connect
      plugins = [WebRic::Plugin::Connect,WebRic::Plugin::Messages,WebRic::Plugin::Join]
      @bot = Cinch::Bot.new

      @bot.configure do |c|
        c.server = @server
        c.nick = @nick
        c.channels = ["#WebRicIRC"]
        c.plugins.plugins = plugins
        plugins.each do |plug|
          c.plugins.options[plug] = {webclient: self}
        end
      end

      EM.defer{
        @bot.start
      }

    end

    def socket
      @ws
    end

    def names(channel)
      target=@bot.Channel(channel)
      users = target.users.map { |u,m| "#{'@' if m.include? "o" }#{'+' if m.include? "v"}#{u}"}.sort
      send_command("names",users: users)
    end

    def systemmsg(head, message)
      send_command(:systemmsg, head: head, message: message )
    end

    def privmsg(channel,nick,message)
      send_command(:privmsg, nick: nick, channel: channel , message: Filter.text(message))
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

EventMachine.run do
  @clients = Hash.new
  EM::WebSocket.run(:host => "0.0.0.0", :port => 8383) do |ws|
    ws.onopen do |handshake|
      peer_port, peer_ip = Socket.unpack_sockaddr_in(ws.get_peername)
      puts "Connected: #{peer_ip}:#{peer_port}"
      client = WebRic::Client.new(ws)
      client.peer_ip = peer_ip
      client.peer_port = peer_port
      @clients[ws] = client
      client.systemmsg("WebRic","Welcome to WebRic!")
    end

    ws.onclose do
      puts "Disconnected: #{@clients[ws].peer_ip}:#{@clients[ws].peer_port}"
      @clients[ws].bot.quit("WebRic - Lost Web Client")
      @clients[ws].systemmsg("Disconnected.", "You have been disconnected.")
      @clients.delete(ws)
    end

    ws.onmessage do |msg|
      puts "Received Message: #{msg}"
      @clients[ws].parse_command(JSON.parse(msg))
    end
  end
end if __FILE__ == $0
