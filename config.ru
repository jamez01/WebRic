require './app.rb'

Signal.trap 'TERM' do
  Process.kill 9, Process.pid
end

map '/' do
  run WebRic
end
