"use strict";

var mongoskin = require('mongoskin')
  , RequestUtils = require('../requestUtils')
  , _ = require('underscore')
  , util = require('util')
  , daoUtils = require('./daoUtils')
  , businessDAO = require('./businessDAO')
  , cache_manager = require('cache-manager')
  , neighborhoodMemoryCache = cache_manager.caching({store: 'memory', max: 1000, ttl: 180/*seconds*/})
  , COLL_NEIGHBORHOOD_GEO = 'neighborhoodGeo'
  , GLOBAL_PENDING_NEIGHBORHOOD_NAME = require('../../routes/neighborhood').GLOBAL_PENDING_NEIGHBORHOOD_NAME;

var neighborhoodGeo = function (db) {
  return db.collection(COLL_NEIGHBORHOOD_GEO);
};

exports.findNeighborhoodsForLonLat = function (db, lon, lat, callback) {
  /*
   example query:
   db.neighborhoodGeo.find({"geometry" : { $geoIntersects : { $geometry : { type: "Point", coordinates : [ -73.95324640000001, 40.7766271 ] }}}}, {"name":1, "geo_name":1, "city":1, "level":1, "position":1, "path":1, "parent_path":1, "parent_name":1, "parent_id": 1}).sort({"level":-1});
   */
  var query = { geometry: { $geoIntersects: { $geometry: { type: "Point", coordinates: [lon, lat]}}}},
    searchOptions = {sort : {level : -1, name: 1}};
    //searchOptions = {sort : {level : -1}, limit: 1};
  neighborhoodGeo(db).findItems(query, searchOptions, callback);
};

exports.addNeighborhood = function (db, neighborhood, callback) {
  neighborhoodGeo(db).insert(neighborhood, callback);
};

exports.findNeighborhoodsByParentId = function (db, parentId, callback) {
  var query = {parentId: parentId},
    searchOptions = {sort : {name: 1}};
  console.log("get neighborhoods for parentId '" + parentId + "'");
  neighborhoodGeo(db).findItems(query, searchOptions, callback);
};

exports.findNeighborhoodsByParentIdsRecursive = function (db, parentIds, memo, callback) {
  var query = {parentId: {$in: parentIds}},
    searchOptions = {sort : {name: 1}};
  neighborhoodGeo(db).findItems(query, searchOptions, function (err, data) {
    if (err) {
      callback(err, data);
    } else {
      if (_.isEmpty(data)) {
        callback(null, memo);
      } else {
        var currentIds = _.map(data, function (v) {
          return v._id.toString();
        })
          , aggregateResults = (memo || []).concat(data);
        exports.findNeighborhoodsByParentIdsRecursive(db, currentIds, aggregateResults, callback);
      }
    }
  });
};


exports.findAll = function (db, callback) {
  neighborhoodGeo(db).findItems({}, {sort : {name: 1}}, callback);
};


exports.findById = function (db, id, callback) {
  neighborhoodMemoryCache.wrap(id, function (cacheCallback) {
    neighborhoodGeo(db).findById(id, cacheCallback);
  }, callback);
};


exports.findAllCities = function (db, callback) {
  neighborhoodGeo(db).findItems({level: 0}, {sort : {name : 1}},  callback);
};


exports.findNearestCities = function (db, lon, lat, maxDistance, callback) {
  var query = {};
  query = RequestUtils.buildQueryObjectForGeospatialNear(query, 'geometry', lon, lat, maxDistance);
  query.level = 0;
  neighborhoodGeo(db).findItems(query, {sort : {name : 1}},  callback);
};



exports.findByNameAndParent = function (db, name, parentId, callback) {
  neighborhoodGeo(db).findItems({parentId: parentId, name: name},  callback);
};


exports.findByCityState = function (db, city, state, callback) {
  neighborhoodGeo(db).findItems({level: 0, city: city, state: state}, callback);
};

exports.deleteNeighborhoodGeo = function (db, id, isRecursive, callback) {
  console.log("deleting neighborhood with id of " + id + '.  isRecursive is ' + !!isRecursive);
  neighborhoodGeo(db).removeById(id, callback);
};


exports.updateNeighborhoodGeoById = function (db, id, geometry, callback) {
  neighborhoodGeo(db).update(daoUtils.getIdQuery(id), {$set: {'geometry' : geometry}}, callback);
};

exports.unsetGeometry = function (db, id, callback) {
  neighborhoodGeo(db).update(daoUtils.getIdQuery(id), {$unset: {'geometry' : ''}}, {safe: true, multi: false}, callback);
};


exports.calculateAndSetPOICountForNeighborhoodGeo = function (db, id, callback) {
  if (GLOBAL_PENDING_NEIGHBORHOOD_NAME === id) {
    return;
  }
  businessDAO.countByNeighborhoodGeoIdAndPublished(db, id, true, function (err, poiCount) {
    if (err) {
      callback(err, poiCount);
    } else {
      console.log(util.format("Setting 'poiCount' to %d for neighborhoodGeoId %s", poiCount, id));
      neighborhoodGeo(db).update(daoUtils.getIdQuery(id), {$set: {'poiCount' : poiCount}}, function (error, data) {
        if (error) {
          callback(error, data);
        } else {
          callback(null, poiCount);
        }
      });
    }
  });
};