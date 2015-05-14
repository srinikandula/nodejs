"use strict";

var portalApp = angular.module('beaconApp');

portalApp.factory('appUtils', function () {

  return {
    queryStringFromObject: function (obj) {
      if (_.size(obj) <= 0) {
        return '';
      }
      var queryString = '',
        isFirst = true;
      _.each(obj, function (value, key) {
        if (isFirst) {
          queryString += '?';
        } else {
          queryString += '&';
        }
        isFirst = false;
        queryString += key + '=' + value;
      });
      return queryString;
    }
  };
});


