var express = require('express');
var passport = require('passport');
var router = express.Router();
var bodyParser = require('body-parser');

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
		console.log("Mongo ready");
		userAccount.insert(seedData, function(err, result) {
			if(err) throw err;
			  const spawn = require('child_process').spawn;
			  console.log(req);
			  const bot = spawn('node', ['donation_bot.js', db, req.body.authName]);

			  //runBot(req.body.authName, req.body.email, req.body.password, req.body.password2);
			    
			  res.redirect('/user');
	  		});
	});


});
/*
router.get('/log', function(req,res){
  console.log(req.body);
  //downloads the log
  res.download('Z:/Desktop/auth/authStart/log.txt');
});
*/
router.post('/log', function(req,res){
  console.log(req.body);
  //downloads the log
  res.download('Z:/Desktop/auth/authStart/logs/' + req.body.authName + 'SteamLog');
});

module.exports = router;
