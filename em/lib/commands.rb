module WebRic
  # Commands that can be sent from the web client.
  module Commands
    # Parse and delegate incomming commands from web client

    def parse_command(hash)
      command = hash['command']
      args = hash['args']
      puts "Invalid command: command_#{command}".to_sym unless self.respond_to?("command_#{command}")
      begin
        EM.defer {
          self.method("command_#{command}".to_sym).call(args) if self.respond_to?("command_#{command}")
        }
      rescue
      end
    end

    # Configure server, nick, etc, and connect.
    def command_setup(args)
      setup(args)
    end

    # Send private / channel message.
    def command_privmsg(args)
      channel=args['channel']
      msg=args['message']
      target = @bot.Target(channel)
      target.send(msg)
      privmsg(channel,@bot.nick,msg)
    end

    # Join a channel
    def command_join(args)
      @bot.join(args['args']) if args['args'] && args['args'][0] == "#" # join if actual channel
    end

    # Leave a channel
    def command_part(args)
      target=@bot.Channel(args['args'])
      target.part
    end

    # Send unknown IRC commands to IRC server
    def command_raw(args)

    end

    # Get list of users in channel.
    def command_names(args)
      channel=args['channel']
      target=@bot.Channel(channel)
      users = target.users.map { |u,m| "#{'@' if m.include? "o" }#{'+' if m.include? "v"}#{u}"}.sort
      send_command("names",users: users)
    end

  end
end
