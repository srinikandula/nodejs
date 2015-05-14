'use strict';

angular.module('beaconApp.beaconModule', [])
  .controller('BeaconController', function($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Edit Beacon";

    $scope.beaconId = $routeParams.id;
    $log.debug("beaconId from routeParams is: " + $scope.beaconId);
    $scope.beacon = {};
    $scope.saveButtonText = 'Save';

    $http.get('/api/v1/beacons/' + $scope.beaconId).success(function (beacon) {
      $scope.beacon = beacon;
    }).error(function (error) {
      $log.error("Failed to get beacon by id: " + $scope.beaconId);
    });
    $scope.saveButtonClicked = function () {
      $http.put('/api/v1/beacons/' + $scope.beaconId, $scope.beacon)
        .success(function (data) {
          $log.info("saved changes to beacon successfully");
          $location.url('/beacons');
        })
        .error(function () {
          $log.error("error saving changes to beacon.");
        });
    };
    $scope.deleteButtonClicked = function () {
      $http.delete('/api/v1/beacons/' + $scope.beaconId)
        .success(function (data) {
          $log.info("deleted beacon " + $scope.beaconId);
          $location.url('/beacons');
        })
        .error(function () {
          $log.error("error deleting the beacon.");
        });
    };
  })


  .controller('BeaconAddController', function($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Add New Beacon";
    $scope.saveButtonText = 'Add';
    $scope.isAdd = true;
    $scope.beacon = {}; //{loc:{coordinates:[null,null]}};

    $scope.saveButtonClicked = function () {
      $http.post('/api/v1/beacons', $scope.beacon)
        .success(function (data) {
          $log.info("created new beacon successfully");
          $location.url('/beacons');
        })
        .error(function () {
          $log.error("error adding new beacon");
        });
    };

  })


  .controller('BeaconsController', function($scope, $rootScope, $http, $log, ngTableParams, $location) {
    $scope.headline = "Beacons";
    $scope.beacons = [];

    $scope.beaconsContentTableParams = new ngTableParams({
      page: 1,
      count: 20
    }, {
      total: 0,
      getData: function ($defer, params) {
        $http.get('/api/v1/beacons/count').success(function (data) {
          params.total(data);
        }).error(function (error) {
          params.total(0);
        });
        $http.get('/api/v1/beacons?pageSize=' + params.count() + '&pageNumber=' + params.page()).success(function (data) {
          $scope.beacons = data;
          $defer.resolve(data);
        }).error(function (error) {
          $log.info("Error getting beacons. " + error);
        });
      }
    });

    $scope.editBeacon = function (beaconId) {
      $log.debug("editBeacon w/ id of " + beaconId);
      $location.url('/beacons/' + beaconId);
    };

    $scope.formatCoords = function (beacon) {
      if (beacon && beacon.loc && beacon.loc.coordinates && beacon.loc.coordinates[0] && beacon.loc.coordinates[1]) {
        return beacon.loc.coordinates[0] + ', ' + beacon.loc.coordinates[1];
      } else {
        return '';
      }
    };

  });
