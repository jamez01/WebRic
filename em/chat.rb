require 'em-websocket'
require 'json'
require 'cinch'
require 'gemoji'

module WebRic

  class Client
    attr_accessor :nick, :server, :port, :user_info, :peer_ip, :peer_port
    attr_reader :channels, :bot
    def initialize(ws)
      @nick = "WebRic#{Time.new.to_i}"
      @channels ||= []
      @port ||= 6667
      @server ||= "irc.freenode.net"

      @ws = ws

    end

    def setup(options)
      @nick = options['nick'] if options[:nick]
      @server = options['sever'] if options[:server]
      @port = options['port'] if options[port]
      connect
    end

    def connect
      @bot = Cinch::Bot.new
      @bot.on(:message,//,self) do |m,s|
        # s.send_command("privmsg",:nick => m.user.nick, :message => Filter.text(m.message), :channel => m.channel)
        s.privmsg(m.channel, m.user.nick, m.message)
      end

      @bot.on(:notice,//,self) do |m,s|
        s.send_command("systemmsg", head: "notice", :message => m.message)
      end

      @bot.on(:join,//,self) do |m,s|
        s.on_join(m.user,m.channel)
      end

      @bot.configure do |c|
        c.server = @server
        c.nick = @nick
        c.channels = ["#WebRicIRC"]
      end
      EM.defer{
        @bot.start
      }
    end

    def socket
      @ws
    end

    def on_join(user,channel)
      send_command(:join, nick: user.nick, channel: channel, host: user.host)
    end

    def systemmsg(head, message)
      send_command(:systemmsg, head: head, message: message )
    end

    def privmsg(channel,nick,message)
      send_command(:privmsg, nick: nick, message: Filter.text(message))
    end

    def parse_command(hash)
      command = hash['command']
      args = hash['args']
      puts args
      puts "Invalid command: command_#{command}".to_sym unless self.respond_to?("command_#{command}")
      self.method("command_#{command}".to_sym).call(args) if self.respond_to?("command_#{command}")
    end

    ## Commands

    def command_setup(args)
      puts "Setup!"
      setup(args)
    end

    def command_privmsg(args)
      channel=args['channel']
      msg=args['message']
      target = @bot.Target(channel)
      target.send(msg)
      privmsg(channel,@bot.nick,msg)
    end

    def command_send(args)

    end

    def command_names(args)
      channel=args['channel']
      target=@bot.Channel(channel)
      users = target.users.map { |u,m| "#{'@' if m.include? "o" }#{u}"}.sort
      send_command("names",users: users)
    end

    def send_command(command,args)
      puts "Send Command #{command}: #{args}"
      send({command: command, args: args}.to_json)
    end

    private

    # wrapper methods

    def send(msg)
      @ws.send(msg)
    end


  end

  module Filter
    def self.text(msg)
      text = msg
      text = emoji(text)
      text = smilies(text)
    end

    def self.smilies(msg)
      msg.gsub(/([:;])-?([\)\(DPO\*\|\\\/])/) do |match|
        emoji = case ($1 + $2)
        when ":)"
          Emoji.find_by_alias("smile")
        when ":("
          Emoji.find_by_alias("frowning")
        when ":P"
          Emoji.find_by_alias("stuck_out_tongue")
        when ":D"
          Emoji.find_by_alias("grin")
        when ":*"
          Emoji.find_by_alias("kissing")
        when ":|"
          Emoji.find_by_alias("expressionless")
        when ":\\", ':/'
          Emoji.find_by_alias("confused")
        when ';)', ';D'
          Emoji.find_by_alias("wink")
        when ":O", ":o"
          Emoji.find_by_alias("open_mouth")
        end
        if emoji
          %Q{<img alt="#{match}" src="/images/emoji/#{emoji.image_filename}" style="vertical-align:middle" wdith="20" height="20" />}
        else
          match
        end
      end
    end

    def self.emoji(msg)
      msg.gsub(/:([\w+-]+):/) do |match|
        if emoji = Emoji.find_by_alias($1.downcase)
          %Q{<img alt="#$1" src="/images/emoji/#{emoji.image_filename}" style="vertical-align:middle" width="20" height="20" />}
        else
          match
        end
      end
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
      client.systemmsg("WebRic","Welcome to WebRic!") #"Connected to #{handshake.path}."
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
end
