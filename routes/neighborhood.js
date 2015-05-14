/*
 * Neighborhoods
 *
 * The schema for a neighborhood is:
 * { _id: ObjectId,
 *  stateCity: string,  // format is: <UPPERCASE_STATE_ABBREVIATION>:<lowercase city>  e.g. NY:new york
 *  state: string,  // 2-letter abbreviation, uppercase
 *  city: string  // city name, with proper upper/lower case
 *  neighborhoods: [ n1, n2, n3... ]  // array of Strings -- neighborhood names with proper upper/lower case.
 *  }
 */
"use strict";

var _ = require('underscore'),
  neighborhoodDAO = require('../lib/dao/neighborhoodDAO'),
  RequestUtils = require('../lib/requestUtils'),
  JSONResponseUtils = require('../lib/jsonResponseUtils'),
  util = require('util'),
  mongoskin = require('mongoskin'),
  async = require('async'),
  SecurityUtils = require('../lib/securityUtils');

var COLL_NEIGHBORHOODS = 'neighborhoods';

var neighborhoods = function (db) {
  return db.collection(COLL_NEIGHBORHOODS);
};

var GLOBAL_PENDING_NEIGHBORHOOD_NAME = '(PENDING)';
exports.GLOBAL_PENDING_NEIGHBORHOOD_NAME = GLOBAL_PENDING_NEIGHBORHOOD_NAME;



var transformToNeighborhoodDTO = function (obj, req, options) {
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var objToDTO = function (rawObj) {
    JSONResponseUtils.replaceIdField(rawObj);
    if (_.isEmpty(rawObj.neighborhoods)) {
      rawObj.neighborhoods = [];
    }
    if (!_.contains(rawObj.neighborhoods, GLOBAL_PENDING_NEIGHBORHOOD_NAME)) {
      rawObj.neighborhoods.splice(0, 0, GLOBAL_PENDING_NEIGHBORHOOD_NAME);
    }
  };
  if (_.isArray(obj)) {
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};



exports.findAll = function (db) {
  // ToDo -- limit access to this API call
  return function (req, res) {
    neighborhoodDAO.findAll(db, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error getting all neighborhoods. " + util.inspect(err));
      } else {
        transformToNeighborhoodDTO(result);
        res.json(result);
      }
    });
  };
};

/**
 * Get a list of all cities in each state.  Response object looks like this:
 *
 *
{
  "AK": [
    "Juno"
  ],
  "CA": [
    "San Francisco"
  ],
  "CO": [
    "Boulder"
  ],
  "CT": [
    "Aaasaas"
  ],
  "FL": [
    "Orlando"
  ],
  "ID": [
    "Idaho City"
  ],
  "IL": [
    "Chicago"
  ],
  "IN": [
    "Crown Point",
    "Hobart",
    "South Bend",
    "Давай"
  ],
  "NY": [
    "New York"
  ]
}

 */
exports.getStatesWithCities = function (db) {
  return function (req, res) {
    var sortExpression = {state: 1, city: 1},
      searchOptions = {sort: sortExpression};

    neighborhoods(db).findItems({}, searchOptions, function (err, results) {
      if (err) {
        RequestUtils.errorResponse(res, "Error getting all cities. " + util.inspect(err));
      } else {
        var cities = {};
        if (results) {
          _.each(results, function (val) {
            if (val && val.city && val.state) {
              if (_.isUndefined(cities[val.state])) {
                cities[val.state] = [];
              }
              cities[val.state].push(val.city);
            }
          });
        }
        res.json(cities);
      }
    });
  };
};

/**
 * find all neighborhoods by city AND state
 */
exports.findByCityState = function (db) {
  return function (req, res) {
    var city = RequestUtils.getFieldIfExists('city', req),
      state = RequestUtils.getFieldIfExists('state', req);

    if (_.isEmpty(city) || _.isEmpty(state)) {
      RequestUtils.errorResponse(res, "No city or state was specified.");
      return;
    }
    console.log("get neighborhoods for city '" + city + "' and state '" + state + "'");

    neighborhoodDAO.findByCityState(db, city, state, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding neighborhoods. " + err);
      } else {
        transformToNeighborhoodDTO(item);
        res.json(item);
      }
    });
  };
};


/**
 * requires 'neighborhood', 'city' and 'state' request parameters.  Upserts.
 */
exports.addNeighborhoodToCityState = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, 'addNeighborhoodToCityState()');

    var city = RequestUtils.getFieldIfExists('city', req),
      state = RequestUtils.getFieldIfExists('state', req),
      neighborhood = RequestUtils.getFieldIfExists('neighborhood', req),
      stateCity = neighborhoodDAO.formatStateCityValue(state, city),
      query = {stateCity: stateCity},
      updateOperation;

    if (_.isEmpty(stateCity)) {
      RequestUtils.errorResponse(res, "No city or state was specified.");
      return;
    }
    if (_.isEmpty(neighborhood)) {
      console.log("No neighborhood was specified (but it's optional).");
    }

    if (neighborhood === GLOBAL_PENDING_NEIGHBORHOOD_NAME) {
      RequestUtils.errorResponse(res, "The name '" + GLOBAL_PENDING_NEIGHBORHOOD_NAME + "' is not an acceptable value.");
      return;
    }

    neighborhoodDAO.addNeighborhoodToCityState(db, city, state, neighborhood, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error adding new neighborhood. " + err);
      } else {
        console.log("New city/state/neighborhood updated was successful: " + JSON.stringify(updateOperation, null, 3));
        neighborhoodDAO.findByCityState(db, city, state, function (err, item) {
          if (err) {
            console.log("Error retrieving neighborhood after update.  city: " + city + ", state: " + state);
            res.json(201, null);
          } else {
            transformToNeighborhoodDTO(item);
            res.json(201, item);
          }
        });
      }
    });
  };
};

/**
 * deletes a neighborhood from the list of neighborhoods for that city/state, by the id of the neighborhood entry.
 */
exports.deleteNeighborhoodFromCity = function (db) {
  return function (req, res) {
    var id = req.params.id,
      idQuery = {_id: new mongoskin.BSONPure.ObjectID(id)},
      neighborhood = RequestUtils.getFieldIfExists('neighborhood', req);

    if (neighborhood === GLOBAL_PENDING_NEIGHBORHOOD_NAME) {
      RequestUtils.errorResponse(res, "You cannot delete the default pending neighborhood.");
      return;
    }
    console.log("delete neighborhood '" + neighborhood + "' from id of " + id);

    neighborhoods(db).update(idQuery, {$pull: {neighborhoods: neighborhood}}, function (err) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting neighborhood. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};