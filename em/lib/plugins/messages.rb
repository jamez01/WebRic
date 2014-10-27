module WebRic
  module Plugin
    ## Messages Plugin
    class Messages
      include Cinch::Plugin

      listen_to :message,  :method => :on_message
      listen_to :action,   :method => :on_action
      listen_to :notice,   :method => :on_notice

      def initialize(*)
        super
        @msg_mutex = Mutex.new
        @webclient = config[:webclient]
      end

      def on_message(msg)
        return if msg.message.start_with?("\u0001")
        @msg_mutex.synchronize do
          @webclient.privmsg(msg.channel, msg.user.nick, msg.message)
        end
      end

      def on_action(msg)
        return unless msg.message =~ /^\u0001ACTION(.*?)\u0001/
        action = $1.strip
        @msg_mutex.synchronize do
          @webclient.privmsg(msg.channel, msg.user.nick, action)
        end
      end

      def on_notice(msg)
        @msg_mutex.synchronize do
          @webclient.systemmsg("notice","&lt;#{msg.user.nick}&gt; #{msg.message}")
        end
      end
    end ## !-- End Messages Plugin
  end
end
