require 'spec_helper'
require './em/chat.rb'

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

  it "sends IRC joins to websocket" do
    user = double("User double", nick: "exampleUser", host: "example.com")
    channel = double("Channel double")
    expect(@client).to receive(:send_command).with(:join,{nick: "exampleUser", host: "example.com", channel: channel})
    @client.on_join(user,channel)
  end

  it "sends system messages to websocket" do
    expect(@client).to receive(:send_command).with(:systemmsg, head: "testmsg", message: "message")
    @client.systemmsg("testmsg","message")
  end

  xit "sends privmsg messages to websocket" do
    expect(@client).to receive(:send_command).with(:privmsg, channel: "#test", message: "message", nick: "testUser")
    @client.privmsg("#test", "testUser","message")
  end

  it "can parse a valid command" do
    expect(@client).to receive(:command_privmsg)
    @client.parse_command(command: 'privmsg', args: ["Test"])
  end
end
