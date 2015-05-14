"use strict";

var _ = require('underscore');

var COLL_NEIGHBORHOODS = 'neighborhoods';

var neighborhoods = function (db) {
  return db.collection(COLL_NEIGHBORHOODS);
};


var formatStateCityValue = function (state, city) {
  if (_.isEmpty(state) || _.isEmpty(city)) {
    return '';
  }
  var retval = '';
  if (_.isString(state)) {
    retval += state.toUpperCase();
  }
  retval += ':';
  if (_.isString(city)) {
    retval += city.toLowerCase();
  }
  return retval;
};
exports.formatStateCityValue = formatStateCityValue;


exports.findByCityState = function (db, city, state, callback) {
  var stateCity = formatStateCityValue(state, city),
    searchOptions = {},
    query = {stateCity: stateCity};
  console.log("get neighborhoods for city '" + city + "' and state '" + state + "'");
  neighborhoods(db).findItems(query, searchOptions, function (err, result) {
    if (err) {
      callback(err);
    } else {
      if (_.isArray(result)) {
        if (result.length === 0) {
          callback(null, null);
        } else if (result.length === 1) {
          callback(null, result[0]);
        } else {
          // this should never happen -- there should never be an array of more than 1 value
          callback(null, result);
        }
      } else {
        // this should never happen either...
        callback(null, result);
      }
    }
  });
};

exports.addNeighborhoodToCityState = function (db, city, state, neighborhood, callback) {
  var stateCity = formatStateCityValue(state, city),
    query = {stateCity: stateCity},
    updateOperation = {
      $set: {city: city, state: state.toUpperCase()}
    };
  if (!_.isEmpty(neighborhood)) {
    updateOperation.$addToSet = {'neighborhoods': neighborhood};
  }
  neighborhoods(db).update(query, updateOperation, {safe: true, multi: false, upsert: true}, callback);
};


exports.findAll = function (db, callback) {
  neighborhoods(db).find().toArray(callback);
};