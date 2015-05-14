"use strict";
/*global angular,_*/

var portalApp = angular.module('beaconApp');

portalApp.factory('categoriesManager', function ($rootScope, $http, $log) {

  return {
    reloadCategoryData: function (callback) {
      var i, j, k, category, tmpCatTypes, tmpCatType, tmpCatSubTypes, tmpCatSubType;
      $log.info("Fetching all categories.");
      $http.get('/api/v1/classifications').success(function (data) {
        $rootScope.categories = _.sortBy(data, 'name');
        $rootScope.categoriesMap = {};
        $rootScope.categoryTypes = {};
        $rootScope.categoryTypesMap = {};
        $rootScope.categorySubTypes = {};
        $rootScope.categorySubTypesMap = {};
        if ($rootScope.categories) {
          for (i = 0; i < $rootScope.categories.length; i += 1) {
            category = data[i];
            $rootScope.categoriesMap[category.id] = category;
            tmpCatTypes = (category && category.types) ? category.types : [];
            $rootScope.categoryTypes[category.id] = tmpCatTypes;
            for (j = 0; j < tmpCatTypes.length; j += 1) {
              tmpCatType = tmpCatTypes[j];
              $rootScope.categoryTypesMap[tmpCatType.id] = tmpCatType;
              tmpCatSubTypes = (tmpCatType && tmpCatType.subtypes) ? tmpCatType.subtypes : [];
              $rootScope.categorySubTypes[tmpCatType.id] = tmpCatSubTypes;
              for (k = 0; k < tmpCatSubTypes.length; k += 1) {
                tmpCatSubType = tmpCatSubTypes[k];
                $rootScope.categorySubTypesMap[tmpCatSubType.id] = tmpCatSubType;
              }
            }
          }
        }

        if (angular.isFunction(callback)) {
          callback(null, data);
        }
      }).error(function (error) {
        $log.error("Error getting categories. " + error);
        if (angular.isFunction(callback)) {
          callback(error);
        }
      });
    }
  };
});