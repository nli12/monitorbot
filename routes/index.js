var express = require('express');
var passport = require('passport');
var router = express.Router();
var bodyParser = require('body-parser');
var fs = require('fs')

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

function createPublisherChannel(seedData) {
    // Create an AMPQ "connection"
    ampq_open.connect(ampq_url)
        .then(function(conn) {
            // You need to create at least one AMPQ "channel" on your connection   
            var ok = conn.createChannel();
            ok = ok.then(function(ch){
                publisherChnl = ch;
                // Now create a queue for the actual messages to be sent to the worker dyno 
                publisherChnl.assertQueue('my-worker-q');

                userInput(seedData);

            })
        })
}

function publishMsg(name) {
     // Send the worker a message
     publisherChnl.sendToQueue('my-worker-q', new Buffer(name));
}

function userInput(seedData) {
	var name = seedData['auth_name']; 

	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		db = database; 
		var userAccount = db.collection('UserAccount');

		console.log("MongoDB ready");

		userAccount.find({auth_name:name}).toArray(function(err, docs) {
			console.log(docs);
			console.log(docs.length);
			if (docs.length == 0) {
				userAccount.insert(seedData, function(err, result) {
					if(err) throw err;
					console.log("Inserted New Account in Database");
					publishMsg(name);
				});
			} else {
				userAccount.update({auth_name: name},
				{ $set: 
					{ steam_name: seedData['steam_name'],
					steam_password: seedData['steam_password'],
					steam_auth_code: seedData['steam_auth_code'],
					user_email: seedData['user_email'],
					monitoring: true} 
				},
				function (err, result) {
			        if(err) throw err;
			        console.log("Updated Account in Database");
			        publishMsg(seedData['auth_name']);
				});
			}
		});
	});
}




/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', env: env });
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
		steam_auth_code: req.body.password2,
		user_email: req.user.emails[0].value,
		monitoring: true,
		messages: [],
		other_events: []
	};

	createPublisherChannel(seedData);

	res.redirect('/user');

});

router.post('/log', function(req,res){

	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		var userAccount = database.collection('UserAccount');
		userAccount.findOne({auth_name: req.body.authName}, function(err, doc) {
			if (err) throw err;
			console.log(JSON.stringify(doc['messages']));
			fs.writeFile('test.txt', JSON.stringify(doc['messages']), function(error) {
				res.download('test.txt');
			}); 
		})
	});
});

/*
if (doc[messages].length == 0) {
	answer += "No messages yet!"
}
*/

module.exports = router;
