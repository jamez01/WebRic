require 'spec_helper'
require './webric.rb'
require 'cinch/test'

describe WebRic::Commands do
  before :each do
    @ws = double("Web Socket",send: true)

    @client = WebRic::Client.new(@ws)
  end

  it "Can parse a command" do
    expect(@client).to receive(:command_names).with({ 'channel' => "#WebRicIRC" })
    @client.parse_command({'command' => 'names', 'args' => { 'channel' => "#WebRicIRC" }})
  end

  it "parts channels" do
    @channel = double("Channel", part: true)
    @bot = double("Cinch Bot",Channel: @channel)
    allow(@client).to receive(:bot).and_return(@bot)

    expect(@bot).to receive(:Channel).with("#WebRicIRC")
    expect(@channel).to receive(:part)

    @client.command_part({'args' => "#WebRicIRC"})
  end

  it "joins channels" do
    @bot = double("Cinch Bot",join: true)
    allow(@client).to receive(:bot).and_return(@bot)

    expect(@bot).to receive(:join).with("#WebRicIRC")

    @client.command_join({'args' => "#WebRicIRC"})
  end

  it "lists names" do
    @channel = double("Channel", part: true, :users => {"TestUser"=>"o"})
    @bot = double("Cinch Bot",Channel: @channel)
    allow(@client).to receive(:bot).and_return(@bot)

    expect(@client).to receive(:send_command).with("names",{:users=>["@TestUser"]})

    @client.command_names({'args'  => { 'channel' => '#WebRicIRC'}})
  end

  it "sends actions" do
    @target = double("Target", action: true)
    @bot = double("Cinch Bot", Target: @target, :nick => "TestUser")
    allow(@client).to receive(:bot).and_return(@bot)

    expect(@client).to receive(:action).with("#WebRicIRC","TestUser", "test")

    @client.command_me({'channel' => '#WebRicIRC', 'message' => 'test'})
  end

  it "sends messages" do
    @target = double("Target", send: true)
    @bot = double("Cinch Bot", Target: @target)
    allow(@client).to receive(:bot).and_return(@bot)

    expect(@bot).to receive(:Target).with("#WebRicIRC")
    expect(@target).to receive(:send).with("test")

    @client.command_msg({'args' => '#WebRicIRC test'})
  end
end
