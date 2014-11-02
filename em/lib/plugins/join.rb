module WebRic
  module Plugin
    # Handle on joins, parts, and other channel only related functions
    class Join
      include Cinch::Plugin

      listen_to :join,  :method => :on_join
      listen_to :part,   :method => :on_part
      listen_to :topic,  :method => :on_topic

      def initialize(*)
        super
        @webclient = config[:webclient]
      end

      def on_join(m)
        # @webclient.on_join(m.user,m.channel)
        @webclient.send_command(:join, nick: m.user.nick, channel: m.channel, host: m.user.host)
        @webclient.names(m.channel)
        @webclient.send_command(:topic, nick: m.user.nick, channel: m.channel, topic: m.channel.topic) if m.user.nick == @webclient.nick # Update topic
      end

      def on_part(m)
        # @webclient.on_part(m.user,m.channel)
        @webclient.send_command(:part, nick: m.user.nick, channel: m.channel, host: m.user.host)
        @webclient.names(m.channel)
      end

      def on_topic(m)
        @webclient.send_command(:topic, nick: m.user.nick, channel: m.channel, topic: m.message)
      end

    end ## !-- End Join Plugin
  end
end
