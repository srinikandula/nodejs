"use strict";

var _ = require('underscore')

  , util = require('util')
  , daoUtils = require('./daoUtils')
  , RequestUtils = require('../requestUtils')
  , COLL_BUSINESSES = 'businesses';

var businesses = function (db) {
  return db.collection(COLL_BUSINESSES);
};


exports.findBusinessById = function (db, id, callback) {
  businesses(db).findById(id, callback);
};

exports.countByNeighborhoodGeoIdAndPublished = function (db, neighborhoodGeoId, isPublished, callback) {
  var query = {neighborhoodGeoIds: neighborhoodGeoId, published: isPublished};
  businesses(db).count(query, callback);
};

exports.findBusinessesMinimal = function (db, callback) {
  var fields = {name: 1, addr1: 1, city: 1, state: 1, zip: 1};
  businesses(db).findItems({published: true}, fields, {sort: {name: 1}}, callback);
};


exports.findBusinessesByCategoryId = function (db, categoryId, callback) {
  if (categoryId) {
    businesses(db).findItems({categoryIds: categoryId, published: true}, {sort: {name: 1}}, callback);
  } else {
    callback(null, []);
  }
};

var findNextBusiness = function (db, currentBusiness, callback) {
  if (currentBusiness) {
    var query = { $or : [{name: {$gt : currentBusiness.name}}, {name: currentBusiness.name, _id: {$gt: currentBusiness._id}}], published: true};
    businesses(db).findOne(query, {sort: {name: 1, _id: 1}}, callback);
  } else {
    callback(null, null);
  }
};
exports.findNextBusiness = findNextBusiness;

var findPreviousBusiness = function (db, currentBusiness, callback) {
  if (currentBusiness) {
    var query = { $or : [{name: {$lt : currentBusiness.name}}, {name: currentBusiness.name, _id: {$lt: currentBusiness._id}}], published: true};
    businesses(db).findOne(query, {sort: {name: -1, _id: -1}}, callback);
  } else {
    callback(null, null);
  }
};

exports.findNextAndPreviousBusinessesForCategory = function (db, currentBusiness, callback) {
  findNextBusiness(db, currentBusiness, function (fnbErr, nextBusiness) {
    if (fnbErr) {
      callback(fnbErr, null);
    } else {
      findPreviousBusiness(db, currentBusiness, function (fpbErr, previousBusiness) {
        if (fpbErr) {
          callback(fpbErr, null);
        } else {
          var retval = {nextBusiness: nextBusiness, previousBusiness: previousBusiness};
          callback(null, retval);
        }
      });
    }
  });
};

exports.updateUpdatedAtField = function (db, businessId, callback) {
  businesses(db).update(daoUtils.getIdQuery(businessId), {$set: {updatedAt: new Date()}}, {safe: true, multi: false}, callback);
};

exports.setPrimaryImage = function (db, businessId, imageId, callback) {
  var updateOp,
    queryOptions = {safe: true, multi: false},
    idQuery = daoUtils.getIdQuery(businessId);
  updateOp = {$set: {primaryImageId: imageId}};
  businesses(db).update(idQuery, updateOp, queryOptions, function (err, result) {
    if (err) {
      return _.isFunction(callback) && callback(err, null);
    }
    return _.isFunction(callback) && callback(null, result);
  });
};
