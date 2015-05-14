"use strict";

var portalApp = angular.module('beaconApp');

portalApp.service('businessNavHelper', function ($log, $location, $window, $http) {
  return {
    searchParams: {},
    urlWithQueryParams: '',
    completeResults: [],

    editBusinessAtIndex: function (idx) {
      $log.debug("requesting to edit business index " + idx + ".  There are " + this.completeResults.length + " total businesses.");
      var businessId = this.completeResults[parseInt(idx, 10)].id;
      $log.debug("editBusiness w/ id of " + businessId + " and index of " + idx);
//      $location.url('/businesses/' + businessId + '?idx=' + idx);
      $window.open('/console/#/businesses/' + businessId + '?idx=' + idx);
    },

    editBusinessById: function (businessId) {
      $location.url('/businesses/' + businessId);
    },

    isWebSiteLinkValid: function (url) {
      return url && url.match(/https?:\/\/\S+\.\S+/i);
    },

    handleWebSiteLinkClicked: function (url) {
      if (this.isWebSiteLinkValid(url)) {
        $window.open(url);
      } else {
        $log.warn("invalid website address.  Not opening a new window.  url is: '" + url + "'");
      }
    },

    deleteImage: function (business, imageId, callback) {
      $log.debug("delete image " + imageId + " from business " + business.id);
      var url = '/api/v1/businesses/' + business.id + '/images/' + imageId;
      $http.delete(url, {})
        .success(function (data) {
          return angular.isFunction(callback) && callback(null, business.id);
        })
        .error(function (err) {
          return angular.isFunction(callback) && callback("Error deleting image for business. " + err, null);
        });
    },

    setImageAsPrimary: function (business, imageId, callback) {
      $log.debug("set image " + imageId + " as primary for business " + business.id);
      var url = '/api/v1/businesses/' + business.id + '/images/' + imageId + '/primary';
      $http.put(url, {})
        .success(function (data) {
          business.primaryImageId = imageId;
          return angular.isFunction(callback) && callback(null, business.id);
        })
        .error(function (err) {
          return angular.isFunction(callback) && callback("Error setting primary image for business. " + err, null);
        });
    }
  };
});