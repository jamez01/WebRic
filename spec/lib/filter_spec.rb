require 'spec_helper'
require './em/chat.rb'

describe WebRic::Filter do
  it "sanatizes html tags" do
    expect(WebRic::Filter.new("<a href='#'>Link</a>")).to include "&gt;"
  end

  it "converts smileys to emoji images" do
    expect(WebRic::Filter.new(":)")).to include "/images/emoji/unicode/1f604.png"
  end

  it "convers emoji into images" do
    expect(WebRic::Filter.new(":smile:")).to include "/images/emoji/unicode/1f604.png"
  end

  it "links to images" do
    expect(WebRic::Filter.new("http://example.com/image.png")).to include "</a>"
  end

  it "displays an image" do
    expect(WebRic::Filter.new("http://example.com/image.png")).to include "<img"
  end

  it "turns URLS in to links" do
    expect(WebRic::Filter.new("http://example.com/")).to include "</a>"
  end

end
