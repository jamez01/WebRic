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
require_relative 'lib/client.rb'



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
