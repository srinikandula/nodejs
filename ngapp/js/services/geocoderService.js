'use strict';

var portalApp = angular.module('beaconApp');

portalApp.factory('geocoder', function ($log, $http) {

  var _geocoder = null;

  var createResultDTO = function (result) {
    var arrAddress = result.address_components,
      itemRoute = '',
      itemLocality = '',
      itemCountry = '',
      itemPostalCode = '',
      itemStreetNumber = '',
      itemState = "",
      lat = result.geometry.location.k,
      long = result.geometry.location.B || result.geometry.location.D;

    $log.debug("creating DTO from geocode result: " + angular.toJson(result));
    angular.forEach(arrAddress, function (address_component, i) {

      if (address_component.types[0] === "route") {
        $log.debug("route:" + address_component.long_name);
        itemRoute = address_component.long_name;
      }

      if (    (_.contains(address_component.types, 'locality') && _.contains(address_component.types, 'political'))
           || (_.contains(address_component.types, 'sublocality_level_1') && _.contains(address_component.types, 'sublocality') && _.contains(address_component.types, 'political'))) {
        $log.debug("city:" + address_component.long_name);
        itemLocality = address_component.long_name;
      }

      if (address_component.types[0] === "country") {
        $log.debug("country:" + address_component.long_name);
        itemCountry = address_component.long_name;
      }

      if (address_component.types[0] === "postal_code") {
        $log.debug("pc:" + address_component.long_name);
        itemPostalCode = address_component.long_name;
      } else if (address_component.types[0] === "postal_code_prefix" && !itemPostalCode) {
        $log.debug("pc:" + address_component.long_name);
        itemPostalCode = address_component.long_name;
      }

      if (address_component.types[0] === "administrative_area_level_1") {
        $log.debug("state:" + address_component.short_name);
        itemState = address_component.short_name;
      }

      if (address_component.types[0] === "street_number") {
        $log.debug("street_number:" + address_component.long_name);
        itemStreetNumber = address_component.long_name;
      }
    });
    return {
      lat: lat,
      long: long,
      streetNumber: itemStreetNumber,
      street: itemRoute,
      country: itemCountry,
      state: itemState,
      zip: itemPostalCode,
      city: itemLocality
    };
  };

  return {

    getGeocoder : function () {
      if (_geocoder === null) {
        _geocoder = new google.maps.Geocoder();
      }
      return _geocoder;
    },


    codeAddress: function (addressQuery, callback) {
        $log.debug("geocoding address: " + addressQuery);
        this.getGeocoder().geocode({ 'address': addressQuery }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          if (angular.isFunction(callback)) {
            callback(null, createResultDTO(results[0]));
          }
        } else {
          if (angular.isFunction(callback)) {
            callback(status, null);
          }
          var errorMsg = 'Geocode was not successful for the following reason: ' + status;
          $log.error(errorMsg);
          alert(errorMsg);
        }
      });
    },

    /**
     * @param callback params are err and data, where data is an array
     */
    getNeighborhoodsForLonLat: function (lon, lat, callback) {
      var url = '/api/v1/neighborhoodGeo?lat=' + lat + '&long=' + lon;
      $http.get(url)
        .success(function (data) {
          callback(null, data);
        })
        .error(function (err) {
          callback(err, null);
        });
    },

    /**
     * changes an array of results from a query to neighborhoodsGeo into a list of neighborhood ids
     * @param results
     */
    xformToNeighborhoodGeoIds: function (results) {
      $log.debug("xformToNeighborhoodGeoIds -- " + angular.toJson(results));
      if (_.isEmpty(results) || !angular.isArray(results)) {
        return [];
      }
      var retval = [];
      angular.forEach(results, function (val) {
        retval.push(val.id);
      });
      return retval;
    },

    getHrefForGoogleMapWithLonLat: function (cityNeighborhoodGeo) {
      var zoomLevel = 13;
      if (!cityNeighborhoodGeo || !cityNeighborhoodGeo.long || !cityNeighborhoodGeo.lat) {
        return 'javascript:void(0);';
      }
      return 'http://maps.google.com/maps?q=' + cityNeighborhoodGeo.lat + '+' + cityNeighborhoodGeo.long + '&z=' + zoomLevel + '&ll=' + cityNeighborhoodGeo.lat + ',' + cityNeighborhoodGeo.long;
    }

  };
});
