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

const amqp_url = process.env.CLOUDAMQP_URL;
var open_ampq = require('amqplib').connect(amqp_url);
var consumerChnl;

var nodemailer = require("nodemailer");

var badWords = ["test"];

var info;
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
            info = JSON.parse(msg.content.toString());
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
		authEmail = info['user_email'];
		logOnOptions = {
		  account_name: info['steam_name'],
		  password: info['steam_password']
		}
		authCode = info['steam_auth_code'];

		console.log("Data Loaded");
		setup();

	});

}

function getSHA1(bytes) {
  var shasum = crypto.createHash('sha1');
  shasum.end(bytes);
  return shasum.read();
}

function sendMail(sub, txt) {
  // create reusable transport method (opens pool of SMTP connections)
  var smtpTransport = nodemailer.createTransport("SMTP",{
      service: "Gmail",
      auth: {
          user: "johnnyintern16@gmail.com", // Valid existing email with password
          pass: "ltsinterns"
       }
  });
  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: "Johnny Intern <johnnyintern16@gmail.com>", // sender address
      to: authEmail, // list of receivers
      subject: sub, // subject line
      text: txt // plaintext body
  }
  // send mail with defined transport object
  smtpTransport.sendMail(mailOptions, function(error, response){
      if(error){
          console.log(error);
      }else{
          console.log("Message sent: " + response.message);
      }
      smtpTransport.close(); // shut down the connection pool, no more messages
  });  
}

function checkMessage(message) {
  var size = (badWords.length) - 1;
  while (size > -1) {
    if (message.includes(badWords[size])) {
      var subject = "Steam Monitoring Alert";
      var text = "An expicit term was found in the following message: " + message;
      sendMail(subject, text); 
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

        var subject = "Steam Monitoring Activated";
        var text = "The following account is now being monitored: " + info['steam_name'];
        sendMail(subject, text);

        var currentEvent = {
          datetime: new Date(),
          event: "Monitor bot logged in as " + info['steam_name']
        };

        userAccount.update({auth_name: name, 
                            steam_name: info['steam_name']}, 
                            {$push: {monitoring: true, 
                                    other_events: currentEvent } });

        steamWebLogOn.webLogOn(function(sessionID, newCookie) {
          getSteamAPIKey({
            sessionID: sessionID,
            webCookie: newCookie
            }, function(err, APIKey) {});
        });

      } else {
        console.log("Login attempt failed, please re-enter login credentials");
        steamClient.disconnect();
        return; 
      }
  });

  //alerts on log off for any reason
  steamClient.on('loggedOff', function() {

      var currentEvent = {
        datetime: new Date(),
        event: "Bot logged off and not monitoring, most likely due to a password change"
      };

      userAccount.update({auth_name: name, steam_name: info['steam_name']}, { $push: { other_events: currentEvent } });

  });


  steamClient.on('servers', function(servers) {
      fs.writeFile('servers', JSON.stringify(servers));
  });

  //chat room response
  steamFriends.on('chatInvite', function(chatRoomID, chatRoomName, patronID) {

      var currentEvent = {
        datetime: new Date(),
        event: 'Got an invite to ' + chatRoomName + ' from ' + steamFriends.personaStates[patronID].player_name
      };

      userAccount.update({auth_name: name, steam_name: info['steam_name']}, { $push: { other_events: currentEvent } });

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
      userAccount.update({auth_name: name, steam_name: info['steam_name']}, { $push: { messages: currentMessage } });

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
      userAccount.update({auth_name: name, steam_name: info['steam_name']}, { $push: { messages: currentMessage } });
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
      userAccount.update({auth_name: name, steam_name: info['steam_name']}, { $push: { other_events: currentEvent } });
    }

  });


}

