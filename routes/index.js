var express = require('express');
var passport = require('passport');
var router = express.Router();
var bodyParser = require('body-parser');
var fs = require('fs')
var nodemailer = require("nodemailer");

var mongodb = require('mongodb');
const MONGO_URI = process.env.MONGODB_URI;

var db; 

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};

var ampq_open = require('amqplib');
const ampq_url = process.env.CLOUDAMQP_URL;

var publisherChnl;

function createPublisherChannel() {
    // Create an AMPQ "connection"
    ampq_open.connect(ampq_url)
        .then(function(conn) {
            // You need to create at least one AMPQ "channel" on your connection   
            var ok = conn.createChannel();
            ok = ok.then(function(ch){
                publisherChnl = ch;
                // Now create a queue for the actual messages to be sent to the worker dyno 
                publisherChnl.assertQueue('my-worker-q');
            })
        })
}

function publishMsg(info) {
     // Send the worker a message
     publisherChnl.sendToQueue('my-worker-q', new Buffer.from(JSON.stringify(info)));
}

function sendMail(sub, txt, address) {
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
      to: address, // list of receivers
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


function userInput(seedData) {
	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		db = database; 
		var userAccount = db.collection('UserAccount');

		console.log("MongoDB ready");

		userAccount.findOne({
			auth_name: seedData['auth_name'], 
			steam_name: seedData['steam_name'] 
		}, function(err,doc) {
			if (doc) {
				userAccount.update({
					auth_name: seedData['auth_name'],
					steam_name: seedData['steam_name']
				},
				{ $set: { 
					steam_password: seedData['steam_password'],
					steam_auth_code: seedData['steam_auth_code'],
					monitoring: true
					} 
				}, function (err, result) {
				    if(err) throw err;

				    console.log("Updated Account in Database");

					publishMsg(seedData);

				    /*if (doc['monitoring'] = false){
				    	publishMsg(seedData);
				    } else {
				    	var subject = "Steam Account Already Monitored";
						var text = "You recently tried to activate monitoring for " + seedData['steam_name'] +
								   " an account that is already being monitored.";
						sendMail(subject, text, seedData['user_email']); 
				        console.log("Account Already Being Monitored");
				    }*/
				        
				});

			} else {
				userAccount.insert(seedData, function(err, result) {
				if(err) throw err;
					console.log("Inserted New Account in Database");
					publishMsg(seedData);
				});
			}

		});
	});
}


/* GET home page. */
router.get('/', function(req, res, next) {
  createPublisherChannel();
  res.render('index', { title: 'Express', env: env });
});

router.get('/monitor', function(req, res, next) {
  res.render('monitor', { user: req.user });
});

router.get('/auth', function(req, res, next) {
  res.render('auth', { user: req.user });
});

router.get('/download', function(req, res, next) {
  res.render('download', { user: req.user });
});

router.get('/log_error', function(req, res, next) {
  res.render('log_error', { user: req.user });
});

router.get('/login', function(req, res){
    res.render('login', { env: env });
});

router.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

router.get('/callback',
  passport.authenticate('auth0', { failureRedirect: '/url-if-something-fails' }),
  function(req, res) {
    res.redirect(req.session.returnTo || '/user');
  });

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(bodyParser.json());

router.post('/runbot', function(req, res){

	var seedData = {
		auth_name: req.body.authName,
		steam_name: req.body.email,
		steam_password: req.body.password,
		steam_auth_code: '',
		user_email: req.user.emails[0].value,
		monitoring: false,
		messages: [],
		other_events: []
	};

	userInput(seedData);

	res.redirect('/auth');

});

router.post('/auth', function(req, res){

	var seedData = {
		auth_name: req.body.authName,
		steam_name: req.body.email,
		steam_password: req.body.password,
		steam_auth_code: req.body.password2,
		user_email: req.user.emails[0].value,
		monitoring: false,
		messages: [],
		other_events: []
	};

	userInput(seedData);

	res.redirect('/user');

});

router.post('/log', function(req,res){

	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		var userAccount = database.collection('UserAccount');
		userAccount.findOne({	auth_name: req.body.authName,
								steam_name: req.body.email,
								steam_password: req.body.password}, 
							function(err, doc) {
			if (err) throw err;
			if (doc) {
				var subject = "Steam Activity Log";
				var text = "Messages: \n\n ";

				for (var i = 0, len = doc['messages'].length; i < len; i++){
					text = text + "Datetime: " + doc['messages'][i]['datetime'] + "\n" +
								  "Sender: " + doc['messages'][i]['sender'] + "\n" +
								  "Recipient: " + doc['messages'][i]['recipient'] + "\n" +
								  "Message: " + doc['messages'][i]['message'] + "\n\n";
				}

				text += "Other Events: \n\n";

				for (var i = 0, len = doc['other_events'].length; i < len; i++){
					text = text + "Datetime: " + doc['other_events'][i]['datetime'] + "\n" +
								  "Event: " + doc['other_events'][i]['event'] + "\n\n";
				}

        		sendMail(subject, text, doc['user_email']);
        		res.redirect('/user');
			} else {
				console.log("No such account found")
				res.redirect('/log_error');
			}
			
		})
	});
});


module.exports = router;
