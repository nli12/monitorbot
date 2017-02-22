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

	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		db = database; 
		var userAccount = db.collection('UserAccount');
		console.log("MongoDB ready");
		userAccount.find({auth_name: req.body.authName}).toArray(function(err, docs) {
			console.log(docs);
			console.log(docs.length);
			if (docs.length == 0) {
				userAccount.insert(seedData, function(err, result) {
					if(err) throw err;
					console.log(result);
					const spawn = require('child_process').spawn;
					const bot = spawn('node', ['donation_bot.js', db, req.body.authName]);

					//runBot(req.body.authName, req.body.email, req.body.password, req.body.password2);
					    
					res.redirect('/user');
			  	});
			} else {
				userAccount.update({auth_name: req.body.authName},
				{ $set: 
					{ steam_name: req.body.email,
					steam_password: req.body.password,
					steam_auth_code: req.body.password2,
					user_email: req.user.emails[0].value,
					monitoring: true} 
				},
				function (err, result) {
			        if(err) throw err;
					const spawn = require('child_process').spawn;
					const bot = spawn('node', ['donation_bot.js', db, req.body.authName]);
					res.redirect('/user');
				});
			}
		});
	});

});

router.post('/log', function(req,res){

	mongodb.MongoClient.connect(MONGO_URI, function(err, database) {
		if(err) throw err;
		var userAccount = database.collection('UserAccount');
		userAccount.findOne({auth_name: req.body.authName}, function(err, doc) {
			if (err) throw err;
			console.log(doc);
			console.log(JSON.stringify(doc[messages]));
			fs.writeFile('test.txt', JSON.stringify(doc[messages]), function(error) {
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
