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
                
                var badWords = ["4r5e", "5h1t", "5hit", "a55",
                 "anal", "anus", "ar5e", "arrse", "arse", "ass", "ass-fucker",
                  "asses", "assfucker", "assfukka", "asshole", "assholes", "asswhole", "a_s_s", "b!tch", "b00bs", 
                  "b17ch", "b1tch", "ballbag", "balls", "ballsack", "bastard", "beastiality", "bellend", "bestiality", 
                  "bi+ch", "biatch", "bitch", "bitcher", "bitchers", "bitches", "bitchin", "bitching", "blow job", "blowjob",
                   "blowjobs", "boiolas", "bollock", "bollok", "boner", "boob", "boobs", "booobs", "boooobs", "booooobs", 
                   "booooooobs", "breasts", "buceta", "bum", "bunny fucker", "butt", "butthole", "buttmuch", "buttplug", "c0ck",
                    "c0cksucker", "carpet muncher", "chink", "cl1t", "clit", "clitoris", "clits", "cnut", "cock", "cock-sucker", 
                    "cockface", "cockhead", "cockmunch", "cockmuncher", "cocks", "cocksuck", "cocksucked", "cocksucker", "cocksucking", 
                    "cocksucks", "cocksuka", "cocksukka", "cok", "cokmuncher", "coksucka", "coon", "cox", "crap", "cum", "cummer",
                     "cumming", "cums", "cumshot", "cunilingus", "cunillingus", "cunnilingus", "cunt", "cuntlick", "cuntlicker", 
                     "cuntlicking", "cunts", "cyberfuc", "cyberfuck", "cyberfucked", "cyberfucker", "cyberfuckers", "cyberfucking", 
                     "d1ck", "damn", "dick", "dickhead", "dildo", "dildos", "dirsa", "dlck", "dog-fucker", "donkeyribber", "doosh", 
                     "duche", "dyke", "ejaculate", "ejaculated", "ejaculates", "ejaculating", "ejaculatings", "ejaculation", "ejakulate", 
                     "f u c k", "f u c k e r", "f4nny", "fag", "fagging", "faggitt", "faggot", "faggs", "fagot", "fagots", "fags", 
                     "fanny", "fannyflaps", "fannyfucker", "fanyy", "fatass", "fcuk", "fcuker", "fcuking", "feck", "fecker", 
                     "felching", "fellate", "fellatio", "fingerfuck", "fingerfucked", "fingerfucker", "fingerfuckers", "fingerfucking", 
                     "fingerfucks", "fistfuck", "fistfucked", "fistfucker", "fistfuckers", "fistfucking", "fistfuckings", "fistfucks",
                      "fook", "fooker", "fuck", "fucka", "fucked", "fucker", "fuckers", "fuckhead", "fuckheads", "fuckin", "fucking", 
                      "fuckings", "fuckingshitmotherfucker", "fuckme", "fucks", "fuckwhit", "fuckwit", "fudge packer", "fudgepacker", 
                      "fuk", "fuker", "fukker", "fukkin", "fuks", "fukwhit", "fukwit", "fux", "fux0r", "f_u_c_k", "gangbang", "gangbanged",
                       "gangbangs", "gaylord", "gaysex", "hardcoresex", "hoar", "hoare", "hoer", "homo", "hore", "horniest", "horny",
                        "hotsex", "jack-off", "jackoff", "jap", "jerk-off", "jism", "jiz", "jizm", "jizz", "knob", "knobead", 
                        "knobed", "knobend", "knobhead", "knobjocky", "knobjokey", "kock", "kondum", "kondums", "kum", "kummer", 
                        "kumming", "kums", "kunilingus", "l3i+ch", "l3itch", "labia", "lmfao", "lust", "lusting", "m0f0", "m0fo",
                         "m45terbate", "ma5terb8", "ma5terbate", "masochist", "master-bate", "masterb8", "masterbat*", "masterbat3", 
                         "masterbate", "masterbation", "masterbations", "masturbate", "mo-fo", "mof0", "mofo", "mothafuck", "mothafucka",
                          "mothafuckas", "mothafuckaz", "mothafucked", "mothafucker", "mothafuckers", "mothafuckin", "mothafucking", 
                          "mothafuckings", "mothafucks", "mother fucker", "motherfuck", "motherfucked", "motherfucker", "motherfuckers",
                           "motherfuckin", "motherfucking", "motherfuckings", "motherfuckka", "motherfucks", "muff", "muthafecker", 
                           "muthafuckker", "mutherfucker", "n1gga", "n1gger", "nigg3r", "nigg4h", "nigga", "niggah", "niggas", 
                           "niggaz", "nigger", "niggers", "nob", "nob jokey", "nobhead", "nobjocky", "nobjokey", "numbnuts", "nutsack",
                            "orgasim", "orgasims", "orgasm", "orgasms", "p0rn", "penis", "penisfucker", "phonesex", "phuck", "phuk", 
                            "phuked", "phuking", "phukked", "phukking", "phuks", "phuq", "pigfucker", "pissflaps", "pissin", "pissoff", 
                            "poop", "porn", "porno", "pornography", "pornos", "prick", "pricks", "pron", "pube", "pusse", "pussi", "pussies",
                             "pussy", "pussys", "rectum", "retard", "rimjaw", "rimming", "schlong", "scroat", "scrote", "scrotum", 
                             "semen", "sex", "sh!+", "sh!t", "sh1t", "shag", "shagger", "shaggin", "shagging", "shemale", "shi+", "shit", 
                             "shitdick", "shite", "shited", "shitey", "shitfuck", "shitfull", "shithead", "shiting", "shitings", "shits",
                              "shitted", "shitter", "shitters", "shitting", "shittings", "shitty", "skank", "slut", "sluts", "smegma", 
                              "smut", "snatch", "son-of-a-bitch", "spunk", "s_h_i_t", "t1tt1e5", "t1tties", "teets", "testical", "testicle",
                               "tit", "titfuck", "tits", "titt", "tittie5", "tittiefucker", "titties", "tittyfuck", "tittywank", "titwank", 
                               "turd", "tw4t", "twat", "twathead", "twatty", "twunt", "twunter", "v14gra", "v1gra", "vagina", "viagra", 
                               "vulva", "wang", "wank", "wanker", "wanky", "whoar", "whore"];
       
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