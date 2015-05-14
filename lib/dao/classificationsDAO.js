"use strict";

var COLL_CLASSIFICATIONS = 'classifications'
  , _ = require('underscore')
  , util = require('util')
  , classifications = function (db) {
    return db.collection(COLL_CLASSIFICATIONS);
  };


exports.buildClassificationsMap = function (categoryData) {
  var classificationsMap = {};
  _.each(categoryData, function (val) {
    classificationsMap[val._id.valueOf()] = val;
  });
  return classificationsMap;
};


exports.findItems = function (db, visibleParam, callback) {
  var queryObj = {}
    , searchOptions = {sort: {'name': 1}};
  if (visibleParam === null) {
    queryObj.visible = { $ne: false };
  } else {
    queryObj.visible = visibleParam;
  }
  classifications(db).findItems(queryObj, searchOptions, callback);
};


exports.findAll = function (db, callback) {
  classifications(db).findItems({}, {}, callback);
};


/**
 * fetches all classifications and invokes 'callback', which will receive the map (object) keyed by the classification ids.
 * @param callback will be passed 3 params: error, classificationsMap, classifications
 */
exports.fetchAndBuildClassificationsMap = function (db, callback) {
  exports.findAll(db, function (err, allCatData) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, exports.buildClassificationsMap(allCatData), allCatData);
    }
  });
};

exports.invalidateClassificationMemoryCache = function () {
  console.log("invalidateClassificationMemoryCache() -- No-Op");
};


exports.isClassificationAssociatedWithCategory = function (classificationId, categoryIds, classificationsMap) {
  var category, i;
  if (_.isEmpty(categoryIds) || _.isEmpty(classificationsMap)) {
    return false;
  }
  for (i = 0; i < categoryIds.length; i += 1) {
    category = classificationsMap[categoryIds[i]];
    if (category) {
      if (_.contains(category.associatedClassificationIds, classificationId)) {
        return true;
      }
    }
  }
  return false;
};
