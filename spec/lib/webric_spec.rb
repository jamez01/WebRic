require 'spec_helper'
require './em/chat.rb'
require 'cinch/test'

describe WebRic::Client do
  before :each do
    @ws = double("Web Socket",send: true)
    @cinch = instance_double("Cinch::Bot",start: true)
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

  it "can parse a valid command" do
    expect(@client).to receive(:command_privmsg)
    @client.parse_command({'command' => 'privmsg', 'args' => ["Test"]})
  end
end
