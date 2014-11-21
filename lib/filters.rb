require 'uri'

# Modifies content before sending it to web client
# Use as "#{Filter.new(<message>)}" to convert directly to string and forget
module WebRic
  class Filter

    # Run all the filters on the message
    def initialize(msg)
      @text = msg
      @append = ""
      html
      images
      links
      emoji
      smilies
      append
    end

    # Return the filtered messages
    def to_s
      @text
    end

    # Included to help rspec tests pass
    def include?(inc)
      @text.include? inc
    end

    private

    # Text is included at end of line instead of parsed in place. Useful for displaying images, etc.
    def append
      @text << @append
    end

    # Find HTML links to images, append image to end of text.
    def images
      @text.scan(URI.regexp) do |*match|
        begin
          uri = URI.parse($&)
          id = "image#{Time.now.to_i}"
          @append << "<div class='media'>" <<
            "<button type='button' class='btn btn-xs btn-info' data-toggle='collapse' data-target='##{id}'>Toggle Image</button>" <<
            "<a target='_blank' href='#{uri}'><img id='#{id}' style='max-width: 250px; max-height: 250px;' src='#{uri}' class='media-object collapse in' /></a></div>" if uri.path =~ /(?:jpg|jpeg|bmp|png|gif|svg)$/
        rescue
        end
      end
    end

    # Find HTML links and link them
    def links
      @text.gsub!(URI.regexp) do |*match|
        url=$&
        url =~ /[a-zA-Z]+:\/\// ? "<a target='_blank' href='#{url}'>#{url}</a>" : url
      end
    end

    # Convert < and > to respective HTML codes to prevent HTML injection
    def html
      @text.gsub!(/</,"&lt;")
      @text.gsub!(/>/,"&gt;")
    end

    # Convert smilies (:)) to images
    def smilies
      @text.gsub!(/(?<![a-z])([:;])-?([\)\(DPOo\*\|\\\/])(?!\w)/) do |match|
        emoji = case ($1 + $2)
        when ":)"
          Emoji.find_by_alias("smile")
        when ":("
          Emoji.find_by_alias("frowning")
        when ":P"
          Emoji.find_by_alias("stuck_out_tongue")
        when ":D"
          Emoji.find_by_alias("grinning")
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

    # Convert EMOJI to images
    def emoji
      @text.gsub!(/:([\w+-]+):/) do |match|
        if emoji = Emoji.find_by_alias($1.downcase)
          %Q{<img alt="#$1" src="/images/emoji/#{emoji.image_filename}" style="vertical-align:middle" width="20" height="20" />}
        else
          match
        end
      end
    end
  end
end
