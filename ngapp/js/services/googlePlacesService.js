'use strict';
/*global angular, _*/

var portalApp = angular.module('beaconApp');

portalApp.factory('googlePlaces', function ($log) {
  var manhattan = new google.maps.LatLng(40.7903, -73.9597)
    , mapElement = document.getElementById('map')
    , googleMap = new google.maps.Map(mapElement, {
      center: manhattan,
      zoom: 12
    })
    , service = new google.maps.places.PlacesService(googleMap);

  return {
    getDetailsForPlace: function (placeId, callback) {
      $log.debug("searching for google place_id " + placeId);
      var request = {
        placeId: placeId
      };
      service.getDetails(request, function (place, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          callback(null, place);
        } else {
          callback('Error retrieving place details. ' + angular.toJson(status));
        }
      });
    }
  };
});
