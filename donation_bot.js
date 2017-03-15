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

var mongodb = require('mongodb');
const MONGO_URI = process.env.MONGODB_URI;
var db;
var userAccount;

var amqp_url = process.env.CLOUDAMQP_URL;
var open_ampq = require('amqplib').connect(amqp_url);
var consumerChnl; 

var badWords = ["test"];

var name; 
var authEmail;
var logOnOptions;
var authCode;

console.log("Creating Channel");
createConsumerChannel(); 

// Creates an AMPQ channel for consuming messages on 'my-worker-q'
function createConsumerChannel() {     
    open_ampq
        .then(function(conn) {
            conn.createChannel()
                .then(function(ch) {
                    ch.assertQueue('my-worker-q');
                    consumerChnl = ch;
                    console.log("Channel Created");
                    startConsuming();
            });
        });
}  

function startConsuming() {
    consumerChnl.consume('my-worker-q', function(msg){
        if (msg !== null) {
            name = msg.content.toString();
            initialize();
            consumerChnl.ack(msg);
        }
    })
} 

function initialize() {
	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		db = database; 
		userAccount = db.collection('UserAccount');

		userAccount.findOne({auth_name: name}, function(err, doc) {
		    if (err) throw err;
		    authEmail = doc['user_email'];
		    logOnOptions = {
		      account_name: doc['steam_name'],
		      password: doc['steam_password']
		    }
		    authCode = doc['steam_auth_code'];

		    console.log("Data Loaded");
		    setup();
		});

	});

}

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}

function checkMessage(message) {

    var size = (badWords.length) - 1;
    while (size > -1) {
        if (message.includes(badWords[size])) {
            //send email confirmation for login
            //const spawn = require('child_process').spawn;
            //const confo = spawn('node', ['sendAlert.js', authEmail, message]);
        }
        size--;
    }
}

function setup() {
  console.log("Setup Started");
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

  console.log(logOnOptions);

  activateMonitoring(); 

}

function activateMonitoring() {
  console.log("Activating Monitoring");
  steamClient.connect();
  steamClient.on('connected', function() {
  	  console.log("Logging On");
      steamUser.logOn(logOnOptions);
  });

  steamClient.on('logOnResponse', function(logonResp) {
      if (logonResp.eresult === Steam.EResult.OK) {
          //send email confirmation for login

          //fix email functionality

          //const spawn = require('child_process').spawn;
          //const confo = spawn('node', ['sendConfirm.js', authEmail]);

          var currentEvent = {
            datetime: new Date(),
            event: "Monitor bot logged in as " + logOnOptions.account_name
          };

          userAccount.update({auth_name: name}, { $push: { other_events: currentEvent } });

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
          steamClient.disconnect(); 
      }
  });

  //alerts on log off for any reason
  steamClient.on('loggedOff', function() {
      //const spawn = require('child_process').spawn;
      //const confo = spawn('node', ['sendFailure.js', authEmail]);

      var currentEvent = {
        datetime: new Date(),
        event: "Bot logged off and not monitoring, most likely due to a password change"
      };

      userAccount.update({auth_name: name}, { $push: { other_events: currentEvent } });

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
        datetime: new Date(),
        event: 'Got an invite to ' + chatRoomName + ' from ' + steamFriends.personaStates[patronID].player_name
      };

      userAccount.update({auth_name: name}, { $push: { other_events: currentEvent } });

      steamFriends.joinChat(chatRoomID); // autojoin on invite

  });

  //message sent response
  steamFriends.on('friendMsgEchoToSender', function(source, newMessage, type) {

    var currentMessage = {
      datetime: new Date(),
      sender: "Current User Account",
      recipient: null,
      message: newMessage
    };

    var reciever = null;

    console.log(source);

    if (newMessage != '') {

      try {
        reciever = steamFriends.personaStates[source].player_name; 
      } catch (err) {
      	console.log("Username Error");
      	console.log(err);
        reciever = "Offline User";
      }

      currentMessage.recipient = reciever; 
      userAccount.update({auth_name: name}, { $push: { messages: currentMessage } });

    }
  });

  //message received response
  steamFriends.on('message', function(source, newMessage, type, chatter) {

    // respond to both chat room and private messages
    var currentMessage = {
      datetime: new Date(),
      sender: null,
      recipient: "Current User Account",
      message: newMessage
    };

    var sentBy = null; 

    console.log(source);

    if (newMessage != '') {
      try {
        sentBy = steamFriends.personaStates[source].player_name; 
      } catch (err) {
      	console.log("Username Error");
      	console.log(err);
        sentBy = "Offline User";
      }

      currentMessage.sender = sentBy;
      userAccount.update({auth_name: name}, { $push: { messages: currentMessage } });
    }
  });


  steamFriends.on('clanState', function(clanState) {

    var currentEvent = {
      datetime: new Date(),
      event: null
    };

    if (clanState.announcements.length) {
      currentEvent.event = 'Group with SteamID ' + clanState.steamid_clan + 
                           ' has posted ' + clanState.announcements[0].headline
      userAccount.update({auth_name: name}, { $push: { other_events: currentEvent } });
    }

  });


}

