"use strict";

// ToDo: db.beacons.ensureIndex({"loc" : "2dsphere"})

var _ = require('underscore')
 , RequestUtils = require('../lib/requestUtils')
 , JSONResponseUtils = require('../lib/jsonResponseUtils')
 , mongoskin = require('mongoskin');

var COLL_BEACONS = 'beacons';
var beacons = function (db) {
  return db.collection(COLL_BEACONS);
};


var transformToBeaconDTO = function (obj) {
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var objToDTO = function (rawObj) {
    JSONResponseUtils.appendLatLongIfExist(rawObj);
    JSONResponseUtils.replaceIdField(rawObj);
  };
  if (_.isArray(obj)) {
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};

/*

 Mongo 2d-sphere queries
// 40.7127° N, 74.0059° W
// example of valid NYC long/lat:  40.774536138232236, -73.97994335610099

 http://docs.mongodb.org/manual/tutorial/query-a-2dsphere-index/

 db.<collection>.find( { <location field> :
 { $near :
 { $geometry :
 { type : "Point" ,
 coordinates : [ <longitude> , <latitude> ] } ,
 $maxDistance : <distance in meters>
 } } } )

 -------------------------------------------------------------------

 longitude 88 W and latitude 30 N  =  [ -88 , 30 ]

 GeoJSON point:  http://docs.mongodb.org/manual/reference/glossary/#term-point

 -------------------------------------------------------------------

 http://geojson.org/geojson-spec.html#id2
 Point

 Point coordinates are in x, y order (easting, northing for projected coordinates, longitude,
 latitude for geographic coordinates):

 { "type": "Point", "coordinates": [100.0, 0.0] }

 */


/**
 * factory method to create POJSO from request object
 */
var beaconFromRequest = function (req) {
  if (req) {
    var beacon = {};
    if (req.params.id) {
      beacon._id = req.params.id;
    }
    if (req.body.hasOwnProperty('loc') && req.body.loc.hasOwnProperty('coordinates') && req.body.loc.coordinates.length === 2) {
      beacon.loc = {'type': 'Point', 'coordinates': [parseFloat(req.body.loc.coordinates[0]) || null, parseFloat(req.body.loc.coordinates[1]) || null]};
    } else if (req.body.hasOwnProperty('long') && req.body.hasOwnProperty('lat')) {
      beacon.loc = {'type': 'Point', 'coordinates': [parseFloat(req.body.long) || null, parseFloat(req.body.lat) || null]};
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'beaconId',
      'beaconDate',
      'beaconType',
      'batteryLife',
      'genMgr'
    ], req, beacon);
    return beacon;
  }
  return null;
};

var isValidBeacon = function (obj, isIDRequired) {
  if (obj) {
    if (isIDRequired && !obj.hasOwnProperty('_id')) {
      console.log("beacon is not valid because _id is required");
      return false;
    }
    return obj.hasOwnProperty('name'); /* && obj.hasOwnProperty('loc') && obj.loc.hasOwnProperty('coordinates');*/
  }
  return false;
};



exports.listAllBeacons = function (db) {
  return function (req, res) {
    var query = {}
      , geo = {}
      , searchOptions = {}
      , pageSize = parseInt(RequestUtils.getFieldIfExists('pageSize', req), 10)
      , pageNumber = parseInt(RequestUtils.getFieldIfExists('pageNumber', req), 10)
      , sortExpression = {name: 1};  // ToDo -- allow sort column(s) to be passed as request parameters

    RequestUtils.setFieldsIfExist(['long', 'lat', 'maxDistance'], req, geo);
    if (geo.long && geo.lat) {
      RequestUtils.buildQueryObjectForGeospatialNear(query, 'loc', geo.long, geo.lat, geo.maxDistance);
    }

    if (pageSize > 0) {
      searchOptions.limit = pageSize;
      if (pageNumber > 0) {
        searchOptions.skip = (pageNumber - 1) * pageSize;
      }
    }
    searchOptions.sort = sortExpression;
    beacons(db).find(query, searchOptions).toArray(function (err, items) {
      transformToBeaconDTO(items);
      res.json(items);
    });
  };
};

exports.getBeacon = function(db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("get beacon with id of " + id);
    beacons(db).findById(id, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding beacon with id of " + id);
      } else {
        transformToBeaconDTO(item);
        res.json(item);
      }
    });
  };
};

exports.addBeacon = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, "addBeacon()");
    var beacon = beaconFromRequest(req);
    console.log("add beacon: " + JSON.stringify(beacon));
    if (!isValidBeacon(beacon)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for beacon");
      return;
    }
    beacon.createdAt = new Date();
    beacons(db).insert(beacon, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error inserting new beacon. " + err);
      } else {
        transformToBeaconDTO(result);
        res.json(201, result);
      }
    });
  };
};

exports.editBeacon = function (db) {
  return function (req, res) {
    var id = req.params.id
      , beacon;
    console.log("edit beacon with id of " + id);
    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }
    beacon = beaconFromRequest(req);
    if (!isValidBeacon(beacon, true)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for beacon");
      return;
    }
    delete beacon._id;
    beacons(db).update({_id: new mongoskin.BSONPure.ObjectID(id)}, {$set: beacon}, {safe: true, multi: false}, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error editing beacon. " + err);
      } else {
        console.log("successfully saved changes to beacon " + id + ". result: " + result);
        res.json(200, null);
      }
    });
  };
};

exports.deleteBeacon = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("delete beacon with id of " + id);
    beacons(db).removeById(id, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting beacon. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};


exports.addBusinessToBeacon = function (db) {
  return function (req, res) {
    var beaconId = req.params.id
      , businessId = req.params.businessId
      , idQuery = {_id: new mongoskin.BSONPure.ObjectID(beaconId)}
      , updateOp = {};
    console.log("adding business with id of " + businessId + " to beacon with id of " + beaconId);
    updateOp['$push'] = {businesses: businessId};
    beacons(db).update(idQuery, updateOp, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error adding business to beacon. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};


exports.removeBusinessFromBeacon = function (db) {
  return function (req, res) {
    var beaconId = req.params.id
      , businessId = req.params.businessId
      , idQuery = {_id: new mongoskin.BSONPure.ObjectID(beaconId)}
      , updateOp = {};
    console.log("removing business with id of " + businessId + " from beacon with id of " + beaconId);
    updateOp['$pull'] = {businesses: businessId};
    beacons(db).update(idQuery, updateOp, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error adding business to beacon. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};


exports.getBeaconImages = function (db) {
  return function (req, res) {
    var beaconId = req.params.id;
    // ToDo: implement
    console.log("getBeaconImages() needs to be implemented!");
    res.json([]);
  };
};

/*
exports.findBeaconsNearby = function (db) {
  return function (req, res) {
    var lat = req.body.lat;
    var long = req.body.long;
    beacons(db).find({"loc" : {'$near' : [long, lat]}}).toArray(function (err, values) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding beacons near location. " + err);
      } else {
        values.toArray();
      }
    });
  };
};
*/

exports.countBeacons = function (db) {
  return function (req, res) {
    beacons(db).count(function (err, value) {
      if (err) {
        RequestUtils.errorResponse(res, "Error counting beacons. " + err);
      } else {
        res.json(value);
      }
    });
  };
};
