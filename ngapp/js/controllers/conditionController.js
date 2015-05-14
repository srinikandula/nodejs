'use strict';

angular.module('beaconApp.conditionModule', [])
  .controller('ConditionController', function ($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Edit Condition";

    $scope.conditionId = $routeParams.id;
    $log.debug("conditionId from routeParams is: " + $scope.conditionId);
    $scope.condition = {};
    $scope.saveButtonText = 'Save';

    $http.get('/api/v1/conditions/' + $scope.conditionId).success(function (condition) {
      $scope.condition = condition;
    }).error(function (error) {
      $log.error("Failed to get condition by id: " + $scope.conditionId);
    });
    $scope.saveButtonClicked = function () {
      $http.put('/api/v1/conditions/' + $scope.conditionId, $scope.condition)
        .success(function (data) {
          $log.info("saved changes to condition successfully");
          $location.url('/conditions');
        })
        .error(function () {
          $log.error("error saving changes to condition.");
        });
    };
    $scope.deleteButtonClicked = function () {
      $http.delete('/api/v1/conditions/' + $scope.conditionId)
        .success(function (data) {
          $log.info("deleted condition " + $scope.conditionId);
          $location.url('/conditions');
        })
        .error(function () {
          $log.error("error deleting the condition.");
        });
    };
  })


  .controller('ConditionAddController', function ($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Add New Condition";
    $scope.saveButtonText = 'Add';
    $scope.isAdd = true;
    $scope.condition = {};

    $scope.saveButtonClicked = function () {
      $http.post('/api/v1/conditions', $scope.condition)
        .success(function (data) {
          $log.info("created new condition successfully");
          $location.url('/conditions');
        })
        .error(function () {
          $log.error("error adding new condition");
        });
    };

  })


  .controller('ConditionsController', function ($scope, $rootScope, $http, $log, ngTableParams, $location) {
    $scope.headline = "Conditions";
    $scope.conditions = [];

    $http.get('/api/v1/conditions').success(function (data) {
      $scope.conditions = data;
    }).error(function (error) {
      $log.info("Error getting conditions. " + error);
    });

    $scope.editCondition = function (conditionId) {
      $log.debug("editCondition w/ id of " + conditionId);
      $location.url('/conditions/' + conditionId);
    };

  });
