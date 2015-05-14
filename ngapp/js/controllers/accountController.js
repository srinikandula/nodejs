'use strict';
/*global angular,_*/

angular.module('beaconApp.accountModule', [])
  .controller('AccountController', function($scope, $log, $http, userManager) {
    $scope.headline = "Account";

    $scope.user = {};
    $scope.groups = [];

    userManager.getCurrentUser(function (err, user) {
      if (err) {
        $log.error("error getting current user. " + err);
        return;
      }
      $scope.user = user;
      userManager.getGroupsForCurrentUser(function (err, groups) {
        if (err) {
          $log.error("Error getting current user's groups. " + err);
          return;
        }
        $scope.groups = groups;
      }, true);
    }, true);
  });