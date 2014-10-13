require 'sinatra'

class WebRic < Sinatra::Base
  enable :sessions
  before do
    @default_server = "irc.freenode.net"
    @default_port = 6667
  end
  get '/' do
    erb :index
  end
end
