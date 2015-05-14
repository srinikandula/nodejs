var mongoUri = process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/TESTmedbeaconDB';

var mongo = require('mongoskin');
var db = mongo.db(mongoUri, {native_parser:true});

exports.testDB = db;