// Some helper functions
function scrollDown() {
  $('.scrolldown').each ( function () {
    $(this).scrollTop($(this).prop("scrollHeight"));
  });
}

function parseCommand(parsed) {
  switch (parsed["command"]) {
  case "privmsg":
    privMsg(parsed['args']['nick'], parsed['args']['message']);
    break;
  case "systemmsg":
    systemMsg(parsed['args']['head'], parsed['args']['message'])
    break;
  case "join":
    systemMsg("join",parsed['args']['nick'] + " [" + parsed['args']['host'] + "] ")
    sendCommand("names", {channel: parsed['args']['channel']});
    break;
  case "names":
    updateNames(parsed['args']['users']);
    break;
  }
}


// timeStamp function shamelessly ripped off from https://gist.github.com/hurjas/2660489
function timeStamp() {

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
}

// add private message to channel / query
function privMsg(nick,message) {
  addLine('<li><span class="timestamp">&#91;'+timeStamp()+'&#93;</span><span class="nick">&lt;'+nick+'&gt;</span><span class="message">'+message+'</span></li>');
  scrollDown();
}

// add system message to current channel
function systemMsg(head,message) {
  addLine('<li><span class="timestamp">&#91;'+timeStamp()+'&#93;</span><span class="systemHead">-'+head+'-</span><span class="systemMessage">'+message+'</span></1li>');
  scrollDown();
}

// addLine
function addLine(html) {
  $(html).appendTo('#msglist');
}

function sendCommand(command,args) {
  var cmd={};
  cmd['command'] = command;
  cmd['args'] = args;
  ws.send(JSON.stringify(cmd));
}

function currentChannel(setChannel) {
  var channel = setChannel || channel;
  return "#WebRicIRC";
}

function sendInput(input) {
  var value = $('#inputbox').val();
  sendCommand('privmsg',{channel: currentChannel(), message: value});
  $('#inputbox').val("");

}

function updateNames(users) {
  var user_list = $('#userlist');
  var names = "";
  $.each(users, function (index,user) {
    names = names.concat("<li>"+user+"</li>");
  });
  user_list.html(names);
}
// Make everything fit nicely
$(window).resize(function() {

  var sub = $('#chatContainer').offset().top + $('#inputRow').height() + 70;

  $('body').height($(window).height() - sub);
  $('html').height($(window).height() - sub);

  $('.fill').each( function () {

    $(this).height($(this).parent().height());

  });

  scrollDown();

});

$('#inputbox').keypress(function (e) {
 var key = e.which;
 if(key == 13)  // the enter key code
  {
    sendInput();
    return false;
  }
});

$(window).trigger('resize');

// Web Sockets! Yay!
var Socket = "MozWebSocket" in window ? MozWebSocket : WebSocket;
var ws = new Socket("ws://localhost:8383/");
ws.onmessage = function(evt) {
  var parsed = $.parseJSON(evt.data);
  parseCommand(parsed)

};
ws.onclose = function(event) {
//  debug("Closed - code: " + event.code + ", reason: " + event.reason + ", wasClean: " + event.wasClean);
  systemMsg("ERROR", "Disconnected from server.");
  var ws = new Socket("ws://localhost:8383/");
};
ws.onopen = function() {
//  debug("connected...");
//  ws.send("hello server");
//  ws.send("hello again");
//  $('#connectDialog').modal({show: true});
  $("#inputbox").focus();
  systemMsg("connected", "Connected to WebRic server.");
  sendCommand("setup",{server:'irc.freenode.net', port:6667, nick:'WebRicTestBot'});
};
