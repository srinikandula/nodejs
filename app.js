"use strict";

/**
 * Module dependencies.
 */
var  _ = require('underscore'),
  BASIC_AUTH_USERNAME = _.isUndefined(process.env.ISHIKI_USERNAME) ? 'beacon' : process.env.ISHIKI_USERNAME,
  BASIC_AUTH_PASSWORD = _.isUndefined(process.env.ISHIKI_PW) ? 'beacon123' : process.env.ISHIKI_PW,

  express = require('express'),

  flash = require('connect-flash'),
  engine = require('ejs-locals'),
  routeConfig = require('./routes/routes-config'),
  poi = require('./routes/poi'),
  http = require('http'),
  path = require('path'),
  app = express(),
  util = require('util'),

//http://cwbuecheler.com/web/tutorials/2014/restful-web-app-node-express-mongodb/
// Database
  mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/' + process.env.ISHIKI_DB_NAME,
  mongo = require('mongoskin'),
  db = mongo.db(mongoUri, {native_parser: true, poolSize: 20, auto_reconnect: true}),
  auth = express.basicAuth(BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD),
  stormpathId = process.env.STORMPATH_API_KEY_ID,
  stormpathSecret = process.env.STORMPATH_API_KEY_SECRET,
  stormpathAppHref = process.env.STORMPATH_URL,
  passport = require('passport'),
  StormpathStrategy = require('passport-stormpath'),
  session = require('express-session'),
  MongoStore = require('connect-mongo')(session),
  strategy = new StormpathStrategy({
    apiKeyId: stormpathId,
    apiKeySecret: stormpathSecret,
    appHref: stormpathAppHref,
    expansions: 'groups,customData'
  });

require('./lib/bootstrapDataSeed').seedData(db);

if (process.env.CLOUDINARY_POI_IMG_XFORM) {
  console.log("POI images will be transformed using the value set in CLOUDINARY_POI_IMG_XFORM, which is: " + process.env.CLOUDINARY_POI_IMG_XFORM);
} else {
  console.log("No POI image transformation is configured.  Please set cloudinary transformation parameters in an environment variable named CLOUDINARY_POI_IMG_XFORM");
}

passport.use(strategy);
passport.serializeUser(strategy.serializeUser);
passport.deserializeUser(strategy.deserializeUser);

// all environments
app.engine('ejs', engine);
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
//app.use(express.multipart());
app.use(express.methodOverride());
//app.use(express.bodyParser({defer: true}));
//app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.cookieParser(process.env.EXPRESS_SECRET));
app.use('/console', express.static(path.join(__dirname, 'ngapp')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.EXPRESS_SECRET,
  name: 'sid',
  cookie: {maxAge: 14 * 24 * 60 * 60 * 1000},
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    url: mongoUri
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(app.router);




// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

routeConfig.configureRoutes(app, db, passport);

var server = http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

process.on('SIGINT', function () {
  console.log('Received SIGINT');
  db.close(function () {
    console.log('database has closed');
  });
  server.close();
});
