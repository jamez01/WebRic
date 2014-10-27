require 'spec_helper'
require './em/chat.rb'

describe WebRic::Filter do
  it "sanatizes html tags" do
    expect(WebRic::Filter.text("<a href='#'>Link</a>")).to include "&gt;"
  end

  it "converts smileys to emoji images" do
    expect(WebRic::Filter.text(":)")).to include "/images/emoji/unicode/1f604.png"
  end

  it "convers emoji into images" do
    expect(WebRic::Filter.text(":smile:")).to include "/images/emoji/unicode/1f604.png"
  end

end
