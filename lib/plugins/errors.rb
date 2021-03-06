module WebRic
  module Plugin
    # Display errors received from IRC server to web client
    class Errors
      include Cinch::Plugin
      listen_to :error,  :method => :on_error

      def initialize(*)
        super
        @webclient = config[:webclient]
      end

      def on_error(m)
        @webclient.systemmsg("ERROR", "[#{m.command}] #{m.params.join(" ")}")
      end

    end
  end
end
