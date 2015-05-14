'use strict';

var _ = require('underscore');

var JSONResponseUtils = {
  appendLatLongIfExist: function (item, alwaysAppend) {
    if (item && item.hasOwnProperty('loc') && item.loc.hasOwnProperty('coordinates') && _.isArray(item.loc.coordinates) && item.loc.coordinates.length === 2) {
      item.long = item.loc.coordinates[0];
      item.lat = item.loc.coordinates[1];
      delete item.loc;
    } else {
      if (alwaysAppend) {
        item.long = null;
        item.lat = null;
      }
    }
  },
  replaceIdField: function (item) {
    if (_.isUndefined(item) || _.isNull(item)) {
      return;
    }
    if (_.isArray(item)) {
      _.each(item, function (val) {
        JSONResponseUtils.replaceIdField(val);
      });
    } else {
      if (_.isUndefined(item.id) || _.isNull(item.id)) {
        item.id = item._id;
      }
      delete item._id;
    }
  }
};

module.exports = JSONResponseUtils;