var WebRic = {
  // Set Default options for UI
  defOptions : {
    userOptions : {
      server: 'irc.freenode.net',
      port: 6667,
      nick: 'WebRic_' + new Date().getTime() // try to ensure default nick is unique
    },
    autoConnect: false,
    url: "ws://localhost:8383"
  },
  // Create hash for options (merged defaults, provided configs, and user configs)
  options : {},
  // Actual method to handle configuration
  config : function() {
    // Load config.json file
    var conf;
    $.ajax({
      url: 'config.json',
      async: false,
      dataType: 'json',
      success: function (json) {
        conf = json;
      }
    });
    var queryOptions = new URI(window.location.href).search(true);
    // Hide any any configuration UI elements that are pre-defined in init configuration as these should not be overided
    if ( conf && 'userOptions' in conf) {
      for(var key in conf['userOptions'])  {
        if(typeof key == 'string') {
          var elementName = '#'+key+'Group';
          $(elementName).hide();
        }
      }
    }
    WebRic.options = $.extend(true, {}, WebRic.defOptions, { userOptions: queryOptions }, conf ); // Merge configs
  },
  webSocket : {},
  channels : {},
  // Channel object
  channel : function Channel(name) {
    this.name = name;
    this.users = [];
    this.topic = "";
    this.alerting = false;
  },

  // element IDs begining with # will confuse browsers. FIX it.
  sanatizeChannelName : function(chan) {
    var sanitized = chan;
    sanitized = sanitized.replace(/^#/,"CHANNEL_");
    sanitized = sanitized.replace(/[^a-z_\s]/ig,"_SPECIAL_");
    return sanitized;
  },

  // Determine if a channel needs to be added to UI
  addChannel : function(chan) {
    if( ! (chan in this.channels)) {
      this.channels[chan] = new this.channel(chan);
      if(typeof $('#tab_'+this.sanatizeChannelName(chan)).id === 'undefined') {
        $('#msglist').append('<div role="tabpanel" class="tab-pane fade scrolldown" id="tab_'+this.sanatizeChannelName(chan)+'"></div>');
      }
    }
    this.updateChannels();
  },

  // Display channel tabs in UI
  updateChannels : function() {
    $('#channelList').html('<li><a class="btn navbar-btn btn-primary scrolldown" role="tab" data-toggle="tab" href="#tab___Server">Server</a></li>');

    for(var chan in this.channels) {
      $('#channelList').append('<li>' +
        '<a id="button_'+this.sanatizeChannelName(chan)+'" '+
        'class="btn navbar-btn btn-primary chantab" role="tab" data-toggle="tab" data-name="'+this.channels[chan].name+'" href="#tab_'+this.sanatizeChannelName(this.channels[chan].name)+'">'+
        '<button class="close closechan" type="button"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>'+chan+'</a>'+
        '</li>');
        if ( WebRic.channels[chan].alerting === true ) {
          $('#button_'+this.sanatizeChannelName(chan)).removeClass('btn-primary');
          $('#button_'+this.sanatizeChannelName(chan)).addClass('btn-danger');
        }

    }

    $("a[href=#tab_"+this.sanatizeChannelName(this.currentChannel)+"]").tab('show'); // Make sure current channel is displayed
    WebRic.scrollDown();

    // Handle channel loading
    $('#channelList a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
      var href=$(e.target).attr('href').substr(5);
      // var channel=$(e.target).attr('href').substr(5).replace(/^CHANNEL_/,"#");
      var channel=$(e.target).attr('data-name');
      WebRic.currentChannel = channel;
      WebRic.channels[channel].alerting = false;
      $('#button_'+WebRic.sanatizeChannelName(channel)).addClass('btn-primary');
      $('#button_'+WebRic.sanatizeChannelName(channel)).removeClass('btn-danger');
      if(href != "__Server") { $('#topicMessage').html(WebRic.channels[channel].topic || "&nbsp;"); }
      WebRic.showNames();
      WebRic.scrollDown();
      $("#inputBox").focus();
    });

    // ensure all channels can be closed
    $('button.closechan').on('click',function () {
      var tabId = $(this).parents('li').children('a').attr('href');

      var channel = tabId.substr(5).replace(/^CHANNEL_/,"#");
      // only send part command if tab is actually a channel.
      if (channel.match(/^#/)) {
         WebRic.sendCommand('part',{ args: channel });
       }

      // Switch tabs if closing current tab
      if (WebRic.currentChannel === channel) {
        $(this).parents('li').prev().children('a').tab('show');
      }

      // Remove Channel and tabs
      delete WebRic.channels[channel];
      $(this).parents('li').remove('li');
      $(tabId).remove();
    });


  },

  // Scroll all elements containing the 'scrolldown' class to bottom of history
  scrollDown : function() {
    $('.scrolldown').each ( function() {
      $(this).scrollTop($(this).prop("scrollHeight"));
    });
  },

  // Handle <enter> on input box
  handleInput : function() {
    $('#inputBox').keypress(function(e) {
     var key = e.which;
     if(key == 13)  // the enter key code
      {
        e.preventDefault();
        WebRic.sendInput();
        return false;
      }
    });
    $('#inputSend').click(function(e) { WebRic.sendInput(); });
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
    this.webSocket = new Socket(this.options.url);

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
      $("#inputBox").focus();
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
    var chan = args['channel'] || args['nick'];
    this.privMsg(chan,args['nick'], args['message']);
  },

  // Channel / Private actions
  command_action : function(args) {
    var chan = args['channel'] || args['nick'];
    this.privAction(chan,args['nick'], args['message']);
  },

  // Display system messages (errors, notices, etc)
  command_systemmsg : function(args) {
    this.systemMsg(args['head'], args['message'])
  },

  // Handle users joining channels
  command_join : function(args) {
    this.addChannel(args['channel']);
    this.addLine(args['channel'],'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="action star glyphicon glyphicon-log-in"></span><span class="nick">'+args['nick']+'</span><span class="action join">has joined '+args['channel']+'</span></li>');
  },

  // Handle users leaving channels
  command_part : function(args) {
    this.addLine(args['channel'],'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="action star glyphicon glyphicon-log-out"></span><span class="nick">'+args['nick']+'</span><span class="action join">has left '+args['channel']+'</span></li>');
  },

  // Websocket is sending a list of users on a channel
  command_names : function(args) {
    this.updateNames(args['channel'],args['users']);
  },

  // Handle topic changes
  command_topic : function(args) {
    this.topic(args['channel'],args['topic'])
  },

  // Set Topic in UI
  topic : function(channel,topic) {
    this.addLine(channel,'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="message">Channel topic set to \''+topic+'\'</span></li>');
    this.channels[channel].topic = topic
  },

  // add private message to channel / query UI
  privMsg : function(channel,nick,message) {
    var chan = channel || this.currentChannel
    this.addLine(chan,'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="nick">&lt;'+nick+'&gt;</span><span class="message">'+message+'</span></li>');
  },

  // add actions to UI
  privAction : function(channel,nick,message) {
    var chan = channel || this.currentChannel
    this.addLine(chan,'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="action star glyphicon glyphicon-asterisk"></span><span class="nick">'+nick+'</span><span class="message">'+message+'</span></li>');
  },

  // add system message to current channel
  systemMsg : function(head,message) {
    this.addLine(this.currentChannel,'<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="systemHead">-'+head+'-</span><span class="systemMessage">'+message+'</span></1li>');
  },

  // addLine of text to element
  addLine : function(channel,html) {
    var chan = channel || this.currentChannel
    // If a private message comes in, make sure tab exists.
    if ( ! channel.match(/^#/) && channel != "__Server" ) {
      this.addChannel(channel);
    }

    $(html).appendTo('#tab_'+this.sanatizeChannelName(chan));
    if( ! (chan === this.currentChannel)) {
      this.channels[chan].alerting = true;
      $('#button_'+this.sanatizeChannelName(chan)).removeClass('btn-primary');
      $('#button_'+this.sanatizeChannelName(chan)).addClass('btn-danger');
    }

    // Play alert if needed
    if ( chan != this.currentChannel || this.window_focus === false) {
      $('#notification_sound')[0].play(); // Plays sound.
    }
    this.scrollDown();
  },

  // send command to websocket
  sendCommand : function(command,args) {
    var cmd={};
    cmd['command'] = command;
    cmd['args'] = args;
    this.webSocket.send(JSON.stringify(cmd)); // Convert object to JSON and send it off
  },

  split : function (str, separator, limit) {
      str = str.split(separator);
      if(str.length <= limit) return str;

      var ret = str.splice(0, limit);
      ret.push(str.join(separator));

      return ret;
  },

  // Handle user input

  sendInput : function(input) {
    var value = $('#inputBox').val();
    if(value.substring(0,3) === "/me") {
      WebRic.sendCommand('me', {channel: this.currentChannel, message: value.substring(4) } )
    } else if(value.substring(0,1) === "/") {
      v = this.split(value.substring(1)," ", 1);
      var command=v[0]
      var string=v[1]
      WebRic.sendCommand(command,{args: string});
    } else {
      WebRic.sendCommand('privmsg',{channel: this.currentChannel, message: value});
    }
    $('#inputBox').val("");
  },

  // show user names in list
  showNames : function() {
    if(WebRic.currentChannel === '__Server') {
      $('#userlist').html('');
    } else {
      $('#userlist').html(WebRic.channels[WebRic.currentChannel].users);
    }
  },

  // Modify UI userlist to display user names
  updateNames : function(channel,users) {
    var names = "";
    $.each(users, function(index,user) {
      names = names.concat("<li>"+user+"</li>");
    });
    this.channels[channel].users = names
    this.showNames();
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

    // Connect after modal closes
    $('#connectDialog').on('hidden.bs.modal', function(e) {
      WebRic.connect();
    });
  },

  window_focus: true,

  window_focus_init: function() {
    window.onblur = function() { WebRic.window_focus = false; }
    window.onfocus = function() { WebRic.window_focus = true; }
    document.onblur = window.onblur;
    document.focus = window.focus;
  },


  // Initialize WebRic
  init : function() {
    // Set config
    config = typeof config !== 'undefined' ?  config : {}; // prevent undefined config
    this.config(config);

    $('.nav-tabs').tab();
    this.handleInput(); // Register input handlers
    this.windowResizeConfig(); // Configure window resize handling
    this.window_focus_init();
    this.setupConnectModal(); // Setup the modal for user configured IRC paramaters
    if(! this.options['autoConnect'] === true) {
      this.showConnectModal(); // Display connect modal
    } else {
      this.connect();
    }
    this.currentChannel = "__Server";
    this.updateChannels();

  },

}

// Load up WebRic.
$(document).ready(function() { WebRic.init(); }); //{ autoConnect: true, userOptions: { server: 'localhost', port: 6667 }}); });
