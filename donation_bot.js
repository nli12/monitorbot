var fs = require('fs');
var crypto = require('crypto');
//for redirection
var util = require('util');
var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);

var badWords = ["test"];

var authEmail;
var logOnOptions;
var authCode;

var db = process.argv[2];
var userAccount = db.collection('UserAccount');

userAccount.findOne({auth_name: process.argv[3]}, function(err, doc) {
    if (err) throw err;
    authEmail = doc['user_email'];
    logOnOptions = {
      account_name: doc['steam_name'];
      password: doc['steam_password'];
    }
    authCode = doc['steam_auth_code'];

    setup();
    activateMonitoring(); 

});


function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}

console.log('The code was: ' + authCode)

//redirection
var log_file = fs.createWriteStream('logs/' + process.argv[3] + 'SteamLog', {
    flags: 'a'
});
var log_stdout = process.stdout;


function checkMessage(message) {

    var size = (badWords.length) - 1;
    while (size > -1) {
        if (message.includes(badWords[size])) {
            //send email confirmation for login
            const spawn = require('child_process').spawn;
            const confo = spawn('node', ['sendAlert.js', authEmail, message]);
        }
        size--;
    }
}

function setup() {
  try {
    logOnOptions.sha_sentryfile = getSHA1(fs.readFileSync('sentry'));
  } catch (e) {
    if (authCode !== '') {
      logOnOptions.auth_code = authCode;
    }
  }

  // if we've saved a server list, use it
  if (fs.existsSync('servers')) {
    Steam.servers = JSON.parse(fs.readFileSync('servers'));
  }

}

function activateMonitoring() {

  steamClient.connect();
  steamClient.on('connected', function() {
      steamUser.logOn(logOnOptions);
  });

  steamClient.on('logOnResponse', function(logonResp) {
      if (logonResp.eresult === Steam.EResult.OK) {
          //send email confirmation for login
          const spawn = require('child_process').spawn;
          const confo = spawn('node', ['sendConfirm.js', authEmail]);

          var currentEvent = {
            datetime: new Date()
            event: "Monitor bot logged in as " + logOnOptions.account_name
          };

          userAccount.update({auth_name: process.argv[3]}, { $push: { other_events: currentEvent } });

          //could possilby give away the bot
          //steamFriends.setPersonaState(Steam.EPersonaState.Online);

          steamWebLogOn.webLogOn(function(sessionID, newCookie) {
              getSteamAPIKey({
                  sessionID: sessionID,
                  webCookie: newCookie
              }, function(err, APIKey) {});
          });

      } else {
          console.log("Login attempt failed, please re-enter login credentials");
      }
  });

  //alerts on log off for any reason
  steamClient.on('loggedOff', function() {
      const spawn = require('child_process').spawn;
      const confo = spawn('node', ['sendFailure.js', authEmail]);

      var currentEvent = {
        datetime: new Date()
        event: "Bot logged off and not monitoring, most likely due to a password change"
      };

      userAccount.update({auth_name: process.argv[3]}, { $push: { other_events: currentEvent } });

  });


  steamClient.on('servers', function(servers) {
      fs.writeFile('servers', JSON.stringify(servers));
  });
  /*
                  steamUser.on('updateMachineAuth', function(sentry, callback) {
                    fs.writeFileSync('sentry', sentry.bytes);
                    callback({ sha_file: getSHA1(sentry.bytes) });
                  });
  */

  //chat room response
  steamFriends.on('chatInvite', function(chatRoomID, chatRoomName, patronID) {

      var currentEvent = {
        datetime: new Date()
        event: 'Got an invite to ' + chatRoomName + ' from ' + steamFriends.personaStates[patronID].player_name
      };

      userAccount.update({auth_name: process.argv[3]}, { $push: { other_events: currentEvent } });

      steamFriends.joinChat(chatRoomID); // autojoin on invite

  });

  //message sent response
  steamFriends.on('friendMsgEchoToSender', function(source, newMessage, type) {

    var currentMessage = {
      datetime: new Date()
      sender: "Current User Account"
      recipient: null
      message: newMessage
    };

    var reciever = null; 

    if (message != '') {
      checkMessage(message);
      try {
        reciever = steamFriends.personaStates[source].player_name; 
      } catch (err) {
        reciever = "Offline User"
      }

      currentMessage.recipient = reciever; 
      userAccount.update({auth_name: process.argv[3]}, { $push: { messages: currentMessage } });

    }
  });

  //message received response
  steamFriends.on('message', function(source, message, type, chatter) {

    // respond to both chat room and private messages
    var currentMessage = {
      datetime: new Date()
      sender: null
      recipient: "Current User Account"
      message: newMessage
    };

    var sentBy = null; 

    if (message != '') {
      checkMessage(message);
      try {
        sentBy = steamFriends.personaStates[source].player_name; 
      } catch (err) {
        sentBy = "Offline User"
      }

      currentMessage.sender = sentBy;
      userAccount.update({auth_name: process.argv[3]}, { $push: { messages: currentMessage } });
    }
  });


  steamFriends.on('clanState', function(clanState) {

    var currentEvent = {
      datetime: new Date()
      event: null
    };

    if (clanState.announcements.length) {
      currentEvent.event = 'Group with SteamID ' + clanState.steamid_clan + 
                           ' has posted ' + clanState.announcements[0].headline
      userAccount.update({auth_name: process.argv[3]}, { $push: { other_events: currentEvent } });
    }

  });


}

