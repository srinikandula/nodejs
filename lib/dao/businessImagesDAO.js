"use strict";

var _ = require('underscore');

var COLL_BUSSINESS_IMAGES = 'busImages';

var businessImages = function (db) {
  return db.collection(COLL_BUSSINESS_IMAGES);
};

exports.getBusinessImages = function (db, businessId, callback) {
  businessImages(db).findItems({businessId: businessId}, callback);
};

exports.getNonDefaultImageCountForBusinesses = function (db, callback) {
  /*
   db.busImages.aggregate(
   {"$match": {"is_system_default": { "$ne": true }}},
   {"$project": {"businessId": 1}},
   {"$group": {"_id": "$businessId", "count": {"$sum": 1}}}
   )

   { "_id" : "53999fe468b53ef719ae4374", "count" : 1 }
   { "_id" : "5395cf29361e0358e597d155", "count" : 1 }
   { "_id" : "53fa19aa2665e20000441e9d", "count" : 2 }
   { "_id" : "53df85a196ff987271736245", "count" : 2 }
   { "_id" : "53b8f319140f13d7c4b5297d", "count" : 4 }
   { "_id" : "538dc48164e1f79dfceb1cbc", "count" : 5 }
   { "_id" : "534f106b22e436df1cb679ca", "count" : 2 }
   */
  var pipeline = [
    {"$match": {"is_system_default": { "$ne": true }}},
    {"$project": {"businessId": 1}},
    {"$group": {"_id": "$businessId", "count": {"$sum": 1}}}
  ];
  businessImages(db).aggregate(pipeline, {}, callback);
};

exports.getImage = function (db, imageId, callback) {
  businessImages(db).findById(imageId, callback);
};

exports.deleteImage = function (db, imageId, callback) {
  businessImages(db).removeById(imageId, callback);
};

exports.deleteSystemDefaultImageFromBusiness = function (db, businessId, callback) {
  businessImages(db).remove({businessId: businessId, is_system_default: true}, callback);
};

exports.addImage = function (db, image, callback) {
  businessImages(db).insert(image, function (err, data) {
    if (err) {
      return _.isFunction(callback) && callback("Error inserting default image data into database for business. " + err, null);
    }
    return _.isFunction(callback) && callback(null, data);
  });
};

