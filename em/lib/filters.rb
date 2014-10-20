module WebRic
  module Filter

    def self.text(msg)
      text = msg
      text = emoji(text)
      text = smilies(text)
    end

    def self.smilies(msg)
      msg.gsub(/([:;])-?([\)\(DPO\*\|\\\/])/) do |match|
        emoji = case ($1 + $2)
        when ":)"
          Emoji.find_by_alias("smile")
        when ":("
          Emoji.find_by_alias("frowning")
        when ":P"
          Emoji.find_by_alias("stuck_out_tongue")
        when ":D"
          Emoji.find_by_alias("grin")
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
          %Q{<img alt="#{match}" src="/images/emoji/#{emoji.image_filename}" style="vertical-align:middle" wdith="25" height="25" />}
        else
          match
        end
      end
    end

    def self.emoji(msg)
      msg.gsub(/:([\w+-]+):/) do |match|
        if emoji = Emoji.find_by_alias($1.downcase)
          %Q{<img alt="#$1" src="/images/emoji/#{emoji.image_filename}" style="vertical-align:middle" width="20" height="20" />}
        else
          match
        end
      end
    end
  end
end
