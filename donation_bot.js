                var fs = require('fs');
                var crypto = require('crypto');
                //for redirection
                var util = require('util');
                var Steam = require('steam');
                var SteamWebLogOn = require('steam-weblogon');
                var getSteamAPIKey = require('steam-web-api-key');

                var date;
                var newText;
                var authEmail = process.argv[6];
                
                var badWords = ["test"];
       
                var logOnOptions = {
                  account_name: process.argv[3],
                  password: process.argv[4]
                };

                var authCode = process.argv[5]; // code received by email
                console.log('The code was: ' + process.argv[5])
                 //redirection
                
                var log_file = fs.createWriteStream('logs/' + process.argv[2] +'SteamLog', {flags : 'a'});
                var log_stdout = process.stdout;

                console.log = function(d) { //
                  log_file.write(util.format(d) + '\n');
                  log_stdout.write(util.format(d) + '\n');
                };

                var checkMessage = function(message){


                    var size = (badWords.length)-1;
                    while(size > -1){
                      if(message.includes(badWords[size])){
                       //send email confirmation for login
                       const  spawn = require('child_process').spawn;
                       const confo = spawn('node', ['sendAlert.js', authEmail, message]);
                      }
                      size--;
                    }      
                }

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

                var steamClient = new Steam.SteamClient();
                var steamUser = new Steam.SteamUser(steamClient);
                var steamFriends = new Steam.SteamFriends(steamClient);
                var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);

                steamClient.connect();
                steamClient.on('connected', function() {
                  steamUser.logOn(logOnOptions);
                });



                steamClient.on('logOnResponse', function(logonResp) { 
                  if (logonResp.eresult === Steam.EResult.OK) {
                    console.log("Monitor bot logged in as " + logOnOptions.account_name);

                    //send email confirmation for login
                     const  spawn = require('child_process').spawn;
                      const confo = spawn('node', ['sendConfirm.js', authEmail]);



                    //could possilby give away the bot
                    //steamFriends.setPersonaState(Steam.EPersonaState.Online);

                    steamWebLogOn.webLogOn(function(sessionID, newCookie) {
                      getSteamAPIKey({
                        sessionID: sessionID,
                        webCookie: newCookie
                      }, function(err, APIKey) {
                      });
                    });
                  }
                  else{
                    console.log("Login attempt failed, please re-enter login credentials");
                  }
                });

                //alerts on log off for any reason
                steamClient.on('loggedOff', function(){
                   console.log("Bot logged off and not monitoring, most likely due to a password change");                        
                     const  spawn = require('child_process').spawn;
                     const confo = spawn('node', ['sendFailure.js', authEmail]);
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

                function getSHA1(bytes) {
                  var shasum = crypto.createHash('sha1');
                  shasum.end(bytes);
                  return shasum.read();
                }



                //chat room response
                steamFriends.on('chatInvite', function(chatRoomID, chatRoomName, patronID) {
                  console.log('Got an invite to ' + chatRoomName + ' from ' + steamFriends.personaStates[patronID].player_name);
                  steamFriends.joinChat(chatRoomID); // autojoin on invite
                });

                //message sent response
                steamFriends.on('friendMsgEchoToSender',function(source, message, type){
                  date = new Date();
                  if(message != ''){
                    checkMessage(message);
                    console.log(date);
                    try{
                      console.log("Sent to "+steamFriends.personaStates[source].player_name+ ": " + message);
                      
                  } catch(err){
                    console.log("Sent to offline person: "+message + "\n");                      
                  }
                  }
                });

                //message received response
                steamFriends.on('message', function(source, message, type, chatter) {
                  
                  // respond to both chat room and private messages
                  date = new Date();
                  if(message != ''){
                    checkMessage(message);
                    console.log(date);
                    console.log(steamFriends.personaStates[source].player_name + ": " + message);
                  }
                });


                steamFriends.on('clanState', function(clanState) {
                  if (clanState.announcements.length) {
                    console.log('Group with SteamID ' + clanState.steamid_clan + ' has posted ' + clanState.announcements[0].headline);
                  }
                });