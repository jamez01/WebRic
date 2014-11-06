module WebRic
  module Plugin
    # Handle initial connection to IRC
    class Connect
      include Cinch::Plugin
      listen_to :connect,  :method => :on_connect

      def initialize(*)
        super
        @webclient = config[:webclient]
      end

      def on_connect(*)
        # @webclient = config[:webclient]
        @webclient.systemmsg("CONNECTED", "To IRC Server")
      end

    end
  end
end
