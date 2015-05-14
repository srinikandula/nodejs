'use strict';

angular.module('beaconApp.procedureModule', [])
  .controller('ProcedureController', function($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Edit Procedure";

    $scope.procedureId = $routeParams.id;
    $log.debug("procedureId from routeParams is: " + $scope.procedureId);
    $scope.procedure = {};
    $scope.saveButtonText = 'Save';

    $http.get('/api/v1/procedures/' + $scope.procedureId).success(function (procedure) {
      $scope.procedure = procedure;
    }).error(function (error) {
      $log.error("Failed to get procedure by id: " + $scope.procedureId);
    });
    $scope.saveButtonClicked = function () {
      $http.put('/api/v1/procedures/' + $scope.procedureId, $scope.procedure)
        .success(function (data) {
          $log.info("saved changes to procedure successfully");
          $location.url('/procedures');
        })
        .error(function () {
          $log.error("error saving changes to procedure.");
        });
    };
    $scope.deleteButtonClicked = function () {
      $http.delete('/api/v1/procedures/' + $scope.procedureId)
        .success(function (data) {
          $log.info("deleted procedure " + $scope.procedureId);
          $location.url('/procedures');
        })
        .error(function () {
          $log.error("error deleting the procedure.");
        });
    };
  })


  .controller('ProcedureAddController', function($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams) {
    $scope.headline = "Add New Procedure";
    $scope.saveButtonText = 'Add';
    $scope.isAdd = true;
    $scope.procedure = {};

    $scope.saveButtonClicked = function () {
      $http.post('/api/v1/procedures', $scope.procedure)
        .success(function (data) {
          $log.info("created new procedure successfully");
          $location.url('/procedures');
        })
        .error(function () {
          $log.error("error adding new procedure");
        });
    };

  })


  .controller('ProceduresController', function($scope, $rootScope, $http, $log, ngTableParams, $location) {
    $scope.headline = "Procedures";
    $scope.procedures = [];

    $http.get('/api/v1/procedures').success(function (data) {
      $scope.procedures = data;
    }).error(function (error) {
      $log.info("Error getting procedures. " + error);
    });

    $scope.editProcedure = function (procedureId) {
      $log.debug("editProcedure w/ id of " + procedureId);
      $location.url('/procedures/' + procedureId);
    };

    $scope.formatCoords = function (procedure) {
      if (procedure && procedure.loc && procedure.loc.coordinates && procedure.loc.coordinates[0] && procedure.loc.coordinates[1]) {
        return procedure.loc.coordinates[0] + ', ' + procedure.loc.coordinates[1];
      } else {
        return '';
      }
    };

  });
