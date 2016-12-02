var express = require('express');
var passport = require('passport');
var router = express.Router();
var bodyParser = require('body-parser');

var env = {
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CALLBACK_URL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3000/callback'
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', env: env });


	var pg = require('pg');

	pg.defaults.ssl = true;
	pg.connect(process.env.DATABASE_URL, function(err, client) {
	  if (err) throw err;
	  console.log('Connected to postgres! Getting schemas...');

	    const query = client.query('CREATE TABLE IF NOT EXISTS profileInfo(id SERIAL PRIMARY KEY, email VARCHAR(40) not null, password VARCHAR(40) not null)'); 
	    query.on('end', () => { client.end(); });
	});

  
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


  const spawn = require('child_process').spawn;
  console.log(req);
  const bot = spawn('node', ['donation_bot.js', req.body.authName, req.body.email, req.body.password, req.body.password2, req.user.emails[0].value]);

  //runBot(req.body.authName, req.body.email, req.body.password, req.body.password2);
    
  res.redirect('/user');
});
/*
router.get('/log', function(req,res){
  console.log(req.body);
  //downloads the log
  res.download('Z:/Desktop/auth/authStart/log.txt');
});
*/
router.post('/log', function(req,res){
  //console.log(req.body);
  //downloads the log
  res.download('Z:/Desktop/auth/authStart/logs/' + req.body.authName + 'SteamLog');
});

module.exports = router;
