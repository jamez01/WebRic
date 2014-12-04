require 'spec_helper'
require './webric.rb'
require 'cinch/test'

describe WebRic::Client do
  before :each do
    @ws = double("Web Socket",send: true)
    @client = WebRic::Client.new(@ws)
  end

  it "can bet setup" do
    expect(@client).to receive(:connect)
    @client.setup('nick' => 'test_nick', 'server' => 'irc.test.com', 'port' => 6667)
    expect(@client.nick).to eql("test_nick")
    expect(@client.server).to eql("irc.test.com")
    expect(@client.port).to eql(6667)
  end

  it "can has socket" do
    expect(@client.socket).to eql(@ws)
  end

  it "sends system messages to websocket" do
    expect(@client).to receive(:send_command).with(:systemmsg, head: "testmsg", message: "message")
    @client.systemmsg("testmsg","message")
  end

  it "sends privmsg messages to websocket" do
    expect(@client).to receive(:send_command).with(:privmsg, :nick=>"testUser", :channel=>"#test", :message=> "message")
    @client.privmsg("#test", "testUser","message")
  end

  it "can list names" do
    channel = double("Channel", :users => {"TestUser"=>"o"})
    bot = double("Cinch Bot", Channel: channel)

    allow(@client).to receive(:bot).and_return(bot)

    expect(@client).to receive(:send_command).with("names",{:channel => "#WebRicIRC", :users => ["@TestUser"] })
    @client.names("#WebRicIRC")
  end

  it "can handle actions" do
    expect(@client).to receive(:send_command).with(:action,  {:nick=>"TestUser", :channel=>"#WebRicIRC", :message=>"test"})
    @client.action("#WebRicIRC","TestUser","test")
  end
end
