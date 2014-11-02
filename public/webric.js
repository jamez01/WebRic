var WebRic = {
  // Set Default options for UI
  defOptions : {
    userOptions : {
      server: 'irc.freenode.net',
      port: 6667,
      nick: 'WebRic_' + new Date().getTime() // try to ensure default nick is unique
    }
  },
  // Create hash for options (merged defaults, provided configs, and user configs)
  options : {},
  // Actual method to handle configuration
  config : function(conf) {
    var queryOptions = new URI(window.location.href).search(true);
    // Hide any any configuration UI elements that are pre-defined in init configuration as these should not be overided
    if ( 'userOptions' in conf) {
      for(var key in conf['userOptions'])  {
        if(typeof key == 'string') {
          var elementName = '#'+key+'Group';
          $(elementName).hide();
        }
      }
    }
    WebRic.options = $.extend(true, {}, this.defOptions, { userOptions: queryOptions }, conf ); // Merge configs
  },
  webSocket : {},
  channels : {},
  // Channel object
  channel : function Channel(name) {
    this.name = name;
    this.messages = [];
    this.users = [];
  },

  // Determine if a channel needs to be added to UI
  addChannel : function(chan) {
    if( ! (chan in this.channels)) {
      this.channels[chan] = new this.channel(chan);
    }
    this.updateChannels();
  },

  // Display channel tabs in UI
  updateChannels : function() {
    $('#channelList').html('');
    for(var chan in this.channels) {
      $('#channelList').append('<li><div class="btn-group">' +
        '<a class="btn navbar-btn btn-primary" role="tab" data-toggle="tab" href="#'+this.channels[chan].name.replace(/^#/,"CHANNEL_")+'">'+this.channels[chan].name+'</a>'+
        '<a class="btn btn-primary navbar-btn dropdown-toggle"><span aria-hidden="true">&times;</span></a>' +
        '</div></li>');
    }
  },

  // Scroll all elements containing the 'scrolldown' class to bottom of history
  scrollDown : function() {
    $('.scrolldown').each ( function() {
      $(this).scrollTop($(this).prop("scrollHeight"));
    });
  },

  // Handle <enter> on input box
  handleInput : function() {
    $('#inputbox').keypress(function(e) {
     var key = e.which;
     if(key == 13)  // the enter key code
      {
        WebRic.sendInput();
        return false;
      }
    });
  },

  // Make the UI look proper on window resizes
  windowResizeConfig : function() {
      $(window).resize(function() {

      var sub = $('#chatContainer').offset().top + $('#inputRow').height() + 70;
      $('body').height($(window).height() - sub);
      $('html').height($(window).height() - sub);
      $('.fill').each( function() {
        $(this).height($(this).parent().height());
      });
      WebRic.scrollDown();
    });

    $(window).trigger('resize');

  },

  // Connect to WebSocket backend
  connect : function() {
    var Socket = "MozWebSocket" in window ? MozWebSocket : WebSocket;
    this.webSocket = new Socket("ws://localhost:8383/");

    // Parse incomming data from websockets
    this.webSocket.onmessage = function(evt) {
      var parsed = $.parseJSON(evt.data);
      WebRic.parseCommand(parsed);

    };

    // Auto-reconnect to websocket if connection lost
    this.webSocket.onclose = function(event) {
      WebRic.systemMsg("ERROR", "Disconnected from WebRic Backend... Attempting to reconnect.");
      setTimeout(function() { WebRic.connect(); }, 3000);
    };

    // Setup IRC once connected to websocket backend
    this.webSocket.onopen = function() {
      var server = $('#server').val();
      var nick = $('#username').val();
      var port = $('#port').val();
      $("#inputbox").focus();
      WebRic.systemMsg("Loading", "WebRic backend...");
      WebRic.sendCommand("setup",{server: server, port: port, nick: nick});
    };
  },

  timeStamp : function() {

    var now = new Date(); // Create a date object with the current time
    var time = [ now.getHours(), now.getMinutes()]; // Create an array with the current hour, minute and second
    var suffix = ( time[0] < 12 ) ? "am" : "pm"; // Determine AM or PM suffix based on the hour
    time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12; // Convert hour from military time
    time[0] = time[0] || 12; // If hour is 0, set it to 12

    // If seconds and minutes are less than 10, add a zero
    for ( var i = 1; i < 3; i++ ) {
      if ( time[i] < 10 ) {
        time[i] = "0" + time[i];
      }
    }

    return time.join(":") + suffix; // Return the formatted string
  },

  // Parse incomming websocket commands
  parseCommand: function(parsed) {
    // Send command arguments to proper method, if exists.
    if ("command_"+parsed["command"] in WebRic) {
      WebRic['command_'+parsed["command"]](parsed['args']);
    }
  },

  // Channel / Private messages
  command_privmsg : function(args) {
    this.privMsg(args['nick'], args['message']);
  },

  // Display system messages (errors, notices, etc)
  command_systemmsg : function(args) {
    this.systemMsg(args['head'], args['message'])
  },

  // Handle users joining channels
  command_join : function(args) {
    this.systemMsg("join",args['nick'] + " [" + args['host'] + "]");
    this.addChannel(args['channel']);
  },

  // Handle users leaving channels
  command_part : function(args) {
    this.systemMsg("part",args['nick'] + " ["+ args['host'] +"]");
  },

  // Websocket is sending a list of users on a channel
  command_names : function(args) {
    this.updateNames(args['users']);
  },

  // Handle topic changes
  command_topic : function(args) {
    this.topic(args['topic'])
  },

  // Set Topic in UI
  topic : function(topic) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="message">Channel topic set to '+topic+'</span></li>');
    $('#topicMessage').html(topic || "&nbsp;");
  },

  // add private message to channel / query UI
  privMsg : function(nick,message) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="nick">&lt;'+nick+'&gt;</span><span class="message">'+message+'</span></li>');
    this.scrollDown();
  },

  // add system message to current channel
  systemMsg : function(head,message) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="systemHead">-'+head+'-</span><span class="systemMessage">'+message+'</span></1li>');
    this.scrollDown();
  },

  // addLine of text to element
  addLine : function(html) {
    $(html).appendTo('#msglist');
  },

  // send command to websocket
  sendCommand : function(command,args) {
    var cmd={};
    cmd['command'] = command;
    cmd['args'] = args;
    this.webSocket.send(JSON.stringify(cmd)); // Convert object to JSON and send it off
  },

  // Handle user input
  sendInput : function(input) {
    var value = $('#inputbox').val();
    WebRic.sendCommand('privmsg',{channel: this.currentChannel, message: value});
    $('#inputbox').val("");

  },

  // Modify UI userlist to display user names
  updateNames : function(users) {
    var user_list = $('#userlist');
    var names = "";
    $.each(users, function(index,user) {
      names = names.concat("<li>"+user+"</li>");
    });
    user_list.html(names);
  },


  // Display modal
  showConnectModal : function() {
    $('#connectDialog').modal({ backdrop: 'static', keyboard: false}); // preent <ESC> from closing modal
    $('#connectDialog').modal('show');

  },

  // Setup modal prior to it's being displayed
  setupConnectModal : function() {

    // Set UI fields to configured defaults
    $('#server').val(this.options.userOptions.server);
    $('#port').val(this.options.userOptions.port);
    $('#username').val(this.options.userOptions.nick);
    $('#connectDialog').modal({ backdrop: 'static', keyboard: false});

    // Connect after modal closes
    $('#connectDialog').on('hidden.bs.modal', function(e) {
      WebRic.connect();
    });
  },

  // Initialize WebRic
  init : function(config) {
    // Set config
    config = typeof config !== 'undefined' ?  config : {}; // prevent undefined config
    this.config(config);

    // Create Socket
    this.config.webSocketURL = this.config.webSocketURL
      || "ws://localhost:8080";

    this.handleInput(); // Register input handlers
    this.windowResizeConfig(); // Configure window resize handling
    this.setupConnectModal(); // Setup the modal for user configured IRC paramaters
    this.showConnectModal(); // Display connect modal

    this.currentChannel = "#WebRicIRC" // This will be auto-configured at some point....
  },

}

// Load up WebRic.
$(window).ready(function() { WebRic.init({ userOptions: { server: 'localhost', port: 6667 }}); });
