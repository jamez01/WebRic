var WebRic = {
  defOptions : {
    userOptions : {
      server: 'irc.freenode.net',
      port: 6667,
      nick: 'webric'
    }
  },
  options : {},
  config : function(conf) {

    // Hide any any configuration UI elements that are pre-defined in init configuration as these should not be overided
    if ( 'userOptions' in conf) {
      for(var key in conf['userOptions'])  {
        if(typeof key == 'string') {
          var elementName = '#'+key+'Group';
          $(elementName).hide();
        }
      }
    }

    var urlOptions = {};
    urlOptions['server'] = $.querystring['server'];
    urlOptions['port'] = $.querystring['port'];
    urlOptions['nick'] = $.querystring['nick'];
    urlOptions['channel'] = $.querystring['channel'];
    // set the options with default options having the lowest priority, then options specified in the url, and options specified at init with the highest priority
    WebRic.options = $.extend(true, {}, this.defOptions, { userOptions: urlOptions }, conf );
  },
  webSocket : {},
  channels : {},
  channel : function Channel(name) {
    this.name = name;
    this.messages = [];
    this.users = [];
  },

  addChannel : function(chan) {
    if( ! (chan in this.channels)) {
      this.channels[chan] = new this.channel(chan);
    }
    this.updateChannels();
  },

  updateChannels : function() {
    $('#channelList').html('');
    for(var chan in this.channels) {
      $('#channelList').append('<li><div class="btn-group">' +
        '<a class="btn  navbar-btn btn-primary" data-toggle="tab">'+this.channels[chan].name+'</a>'+
        '<a class="btn btn-primary navbar-btn dropdown-toggle"><span aria-hidden="true">&times;</span></a>' +
        '</div></li>');
    }
  },

  scrollDown : function() {
    $('.scrolldown').each ( function() {
      $(this).scrollTop($(this).prop("scrollHeight"));
    });
  },

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

  connect : function() {
    var Socket = "MozWebSocket" in window ? MozWebSocket : WebSocket;
    this.webSocket = new Socket("ws://localhost:8383/");

    this.webSocket.onmessage = function(evt) {
      var parsed = $.parseJSON(evt.data);
      WebRic.parseCommand(parsed);

    };

    this.webSocket.onclose = function(event) {
      WebRic.systemMsg("ERROR", "Disconnected from WebRic Backend... Attempting to reconnect.");
      setTimeout(function() { WebRic.connect(); }, 3000);
    };

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

  // Create a date object with the current time
    var now = new Date();

  // Create an array with the current hour, minute and second
    var time = [ now.getHours(), now.getMinutes()];

  // Determine AM or PM suffix based on the hour
    var suffix = ( time[0] < 12 ) ? "am" : "pm";

  // Convert hour from military time
    time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

  // If hour is 0, set it to 12
    time[0] = time[0] || 12;

  // If seconds and minutes are less than 10, add a zero
    for ( var i = 1; i < 3; i++ ) {
      if ( time[i] < 10 ) {
        time[i] = "0" + time[i];
      }
    }

  // Return the formatted string
    return time.join(":") + suffix;
  },

  parseCommand: function(parsed) {
    if ("command_"+parsed["command"] in WebRic) {
      WebRic['command_'+parsed["command"]](parsed['args']);
    }
  },

  command_privmsg : function(args) {
    this.privMsg(args['nick'], args['message']);
  },

  command_systemmsg : function(args) {
    this.systemMsg(args['head'], args['message'])
  },

  command_join : function(args) {
    this.systemMsg("join",args['nick'] + " [" + args['host'] + "]");
    this.addChannel(args['channel']);
  },

  command_part : function(args) {
    this.systemMsg("part",args['nick'] + " ["+ args['host'] +"]");
  },

  command_names : function(args) {
    this.updateNames(args['users']);
  },

  command_topic : function(args) {
    this.topic(args['topic'])
  },

  // Set Topic
  topic : function(topic) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="message">Channel topic set to '+topic+'</span></li>');
    $('#topicMessage').html(topic || "&nbsp;");
  },

  // add private message to channel / query
  privMsg : function(nick,message) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="nick">&lt;'+nick+'&gt;</span><span class="message">'+message+'</span></li>');
    this.scrollDown();
  },

  // add system message to current channel
  systemMsg : function(head,message) {
    this.addLine('<li><span class="timestamp">&#91;'+this.timeStamp()+'&#93;</span><span class="systemHead">-'+head+'-</span><span class="systemMessage">'+message+'</span></1li>');
    this.scrollDown();
  },

  // addLine
  addLine : function(html) {
    $(html).appendTo('#msglist');
  },

  sendCommand : function(command,args) {
    var cmd={};
    cmd['command'] = command;
    cmd['args'] = args;
    this.webSocket.send(JSON.stringify(cmd));
  },

  sendInput : function(input) {
    var value = $('#inputbox').val();
    WebRic.sendCommand('privmsg',{channel: this.currentChannel, message: value});
    $('#inputbox').val("");

  },

  updateNames : function(users) {
    var user_list = $('#userlist');
    var names = "";
    $.each(users, function(index,user) {
      names = names.concat("<li>"+user+"</li>");
    });
    user_list.html(names);
  },


  showConnectModal : function() {
    $('#connectDialog').modal('show');
  },

  setupConnectModal : function() {
    $('#server').val(this.options['server']);
    $('#port').val(this.options['port']);
    $('#username').val(this.options['nick']);
    $('#connectDialog').modal({ backdrop: 'static', keyboard: false});
    $('#connectDialog').on('hidden.bs.modal', function(e) {
      WebRic.connect();
    });
  },

  init : function(config) {
    config = typeof config !== 'undefined' ?  config : {}; // prevent undefined config
    this.config(config);
    this.config.webSocketURL = this.config.webSocketURL
      || "ws://localhost:8080";

    this.handleInput();
    this.windowResizeConfig();
    // this.connect();
    this.setupConnectModal();
    this.showConnectModal();
    $('#connectDialog').modal({ backdrop: 'static', keyboard: false});
    $('#connectDialog').modal('show');

    this.currentChannel = "#WebRicIRC"
  },

}

$(function ($) {
  $.querystring = (function (a) {
    var i,
    p,
    b = {};
    if (a === "") { return {}; }
    for (i = 0; i < a.length; i += 1) {
      p = a[i].split('=');
      if (p.length === 2) {
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
    }
    return b;
  }(window.location.search.substr(1).split('&')));
}(jQuery));

$(window).ready(function() { WebRic.init({ userOptions: { server: 'localhost', port: 6667 }}); });
