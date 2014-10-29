require 'uri'

module WebRic
  class Filter

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

    def to_s
      @text
    end

    def include?(inc)
      @text.include? inc
    end

    private

    def append
      @text << @append
    end

    def images
      @text.scan(URI.regexp) do |*match|
        begin
          uri = URI.parse($&)
          id = "image#{Time.now.to_i}"
          @append << "<div class='media'>" << "<button type='button' class='btn btn-xs btn-info' data-toggle='collapse' data-target='##{id}'>Toggle Image</button>" << "<a target='_blank' href='#{uri}'><img id='#{id}' style='max-width: 250px; max-height: 250px;' src='#{uri}' class='media-object collapse in' /></a></div>" if uri.path =~ /(?:jpg|jpeg|bmp|png|gif|svg)$/
        rescue
        end
      end
    end

    def links
      @text.gsub!(URI.regexp) do |*match|
        url=$&
        url =~ /[a-zA-Z]+:\/\// ? "<a target='_blank' href='#{url}'>#{url}</a>" : url
      end
    end

    def html
      @text.gsub!(/</,"&lt;")
      @text.gsub!(/>/,"&gt;")
    end

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
