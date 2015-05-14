'use strict';
/*global angular, _*/

var portalApp = angular.module('beaconApp');

portalApp.factory('citiesAndNeighborhoodsManager', function ($rootScope, $http, $log) {

  var rawDataWithGeo = null
    , rawChildDataWithGeoMap = {}
    , hasFullDataSet = false
    , PENDING_NEIGHBORHOOD_NAME = '(PENDING)';

  return {
    fetchAllCityAndNeighborhoodData: function (parentId, excludeGeo, skipFullDataReloadIfAlreadyExists, callback) {
      if (parentId) {
        if (hasFullDataSet && skipFullDataReloadIfAlreadyExists) {
          $log.debug("skipping children neighborhood data download...");
          if (angular.isFunction(callback)) {
            callback(null, this.getChildrenByParentId(parentId));
          } else {
            $rootScope.$broadcast('cityAndNeighborhoodInitComplete');
          }
          return;
        }
        $log.debug("fetching city and neighborhood data for parentId " + parentId + "...");

        $http.get('/api/v1/neighborhoodGeo/' + parentId + '/children?isPortal=1' + (excludeGeo === false || excludeGeo === null || _.isUndefined(excludeGeo) ? '' : '&geo=true'))
          .success(function (data) {
            rawChildDataWithGeoMap[parentId] = data;
            if (angular.isFunction(callback)) {
              callback(null, data);
            } else {
              $rootScope.$broadcast('cityAndNeighborhoodInitComplete');
            }
          })
          .error(function (error) {
            $log.debug("error retrieving city/neighborhood data for parentId " + parentId + ". " + angular.toJson(error));
            rawChildDataWithGeoMap[parentId] = null;
            if (angular.isFunction(callback)) {
              callback(error, null);
            }
          });
      } else {
        // fetch EVERYTHING.
        if (hasFullDataSet && skipFullDataReloadIfAlreadyExists) {
          $log.debug("skipping full neighborhood data download...");
          if (angular.isFunction(callback)) {
            callback(null, rawDataWithGeo);
          } else {
            $rootScope.$broadcast('cityAndNeighborhoodInitComplete');
          }
          return;
        }
        $log.debug("fetching ALL city and neighborhood data...");
        $http.get('/api/v1/neighborhoodGeos?isPortal=1' + (excludeGeo === false || excludeGeo === null || _.isUndefined(excludeGeo) ? '' : '&geo=true'))
          .success(function (data) {
            hasFullDataSet = true;
            rawDataWithGeo = data;
            if (angular.isFunction(callback)) {
              callback(null, rawDataWithGeo);
            } else {
              $rootScope.$broadcast('cityAndNeighborhoodInitComplete');
            }
          })
          .error(function (error) {
            $log.debug("error retrieving all city/neighborhood data. " + angular.toJson(error));
            rawDataWithGeo = null;
            if (angular.isFunction(callback)) {
              callback(error, null);
            }
          });
      }
    },

    getAllData: function () {
      return rawDataWithGeo;
    },

    getAllCities: function () {
      return _.select(rawDataWithGeo, function (value) {
        return value && value.level === 0;
      });
    },

    countChildrenById: function (parentId) {
      if (rawChildDataWithGeoMap[parentId]) {
        return rawChildDataWithGeoMap[parentId].length;
      }
      return _.reduce(rawDataWithGeo, function (sum, val) {
        if (val) {
          if (val && val.parentId === parentId) {
            return sum + 1;
          }
          return sum;
        }
      }, 0);
    },

    getChildrenByParentId: function (parentId) {
      if (!parentId) {
        return [];
      }
      if (rawChildDataWithGeoMap[parentId]) {
        return rawChildDataWithGeoMap[parentId];
      }
      return _.select(rawDataWithGeo, function (value) {
        return value && value.parentId === parentId;
      });
    },

    getOneById: function (id) {
      return _.first(_.select(rawDataWithGeo, function (value) {
        return value.id === id;
      }));
    },

    /**
     * returns an array of the order of city -> borough -> neighborhood level 1 ... level N,
     * which can be used for breadcrumbs.  This modifies the descendantsArray and also returns it.
     * @param childObj - neighborhood object to find all parents of.  the last element in the array will be this object
     * @param descendantsArray
     * @returns {*}
     */
    getBreadcrumbDescendants: function (childObj, descendantsArray) {
      var parentObj = null;
      if (childObj) {
        descendantsArray.unshift(childObj);
        if (childObj.parentId) {
          parentObj = this.getOneById(childObj.parentId);
          this.getBreadcrumbDescendants(parentObj, descendantsArray);
        }
      }
      return descendantsArray;
    },

    getNamesByIds: function (neighborhoodGeoIds) {
      if (!rawDataWithGeo) {
        return [];
      }
      if (!angular.isArray(neighborhoodGeoIds)) {
        return [];
      }
      var names = [];
      angular.forEach(rawDataWithGeo, function (val) {
        if (val && val.id/* && val.id !== PENDING_NEIGHBORHOOD_NAME*/) {
          if (_.contains(neighborhoodGeoIds, val.id)) {
            names.push(val.name);
          }
        }
      });
      return names.sort();
    }

  };
});


