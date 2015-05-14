"use strict";
/*global angular, _*/

angular.module('beaconApp.neighborhoodsModule', ['ngTable', 'ui.bootstrap'])

  // ==================================================================================================================
  // ====================================    NeighborhoodsController   ================================================
  // ==================================================================================================================

  .controller('NeighborhoodsController', function ($scope, $http, $log, ngTableParams, $modal, $filter, citiesAndNeighborhoodsManager, geocoder, $location) {
    $log.debug('NeighborhoodsController loading');

    $scope.GLOBAL_PENDING_NEIGHBORHOOD_NAME = '(PENDING)';

    $scope.headline = "Cities";

    $scope.allCities = [];
    $scope.currentPageOfCities = [];
    $scope.citiesAndNeighborhoodsManager = citiesAndNeighborhoodsManager;

    var loadTableData = function (tableParams, $defer) {
      var data = citiesAndNeighborhoodsManager.getAllCities()
        , orderedData = null;

      angular.forEach(data, function (val) {
        val.childrenCount = citiesAndNeighborhoodsManager.countChildrenById(val.id);
      });

      orderedData = tableParams.sorting() ? $filter('orderBy')(data, tableParams.orderBy()) : data;
      $scope.allCities = orderedData;
      tableParams.total(data.length);
      if (angular.isDefined($defer)) {
        $defer.resolve(orderedData);
      }
      $scope.currentPageOfCities = orderedData.slice((tableParams.page() - 1) * tableParams.count(), tableParams.page() * tableParams.count());
    };

    $scope.$on('cityAndNeighborhoodInitComplete', function (e, value) {
      loadTableData($scope.cityContentTableParams);
    });


    $scope.formatCoords = function (city) {
      if (city && city.lat && city.long) {
        return '[' + city.long + ', ' + city.lat + ']';
      }
      return '---';
    };

    $scope.goToNeighborhoodsList = function (id) {
      $location.url('/cities/' + id);
    };

    $scope.getHrefForGoogleMapWithLonLat = function (neighborhood) {
      return geocoder.getHrefForGoogleMapWithLonLat(neighborhood);
    };


    $scope.handleEditLatLonClicked = function (city) {
      var modalInstance = $modal.open({
        templateUrl: 'edit-lat-lon-modal.html',
        controller: 'EditCityLatLonModalController',
        //size: 'sm',
        resolve: {
          city: function () {
            return city;
          }
        }
      });
      modalInstance.result.then(function (data) {
        $log.debug("results from modal EditCityLatLonModalController: " + angular.toJson(data));
        $http.put('/api/v1/city/' + data.id, data)
          .success(function (suc) {
            $log.debug("city changes saved.");
            _.each([$scope.allCities, $scope.currentPageOfCities], function (arr) {
              _.find(arr, function (val) {
                if (val.id === data.id) {
                  val.lat = data.lat;
                  val.long = data.long;
                  return true;
                }
                return false;
              });
            });
          })
          .error(function (err) {
            $log.debug("error saving changes to city: " + err);
          });
      }, function () {
        $log.debug('Modal dismissed at: ' + new Date());
      });
    };



    $scope.cityContentTableParams = new ngTableParams({
      page: 1,
      count: 50,
      sorting: {
        state: 'asc',
        name: 'asc'
      }
    }, {
      total: $scope.currentPageOfCities.length,
      getData: function ($defer, params) {
        $scope.$on('cityAndNeighborhoodInitComplete', function (e, value) {
          loadTableData(params);
        });
      }
    });


    citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData();

    $scope.handleClickAddStateCity = function (size) {
      var modalInstance = $modal.open({
        templateUrl: 'neighborhood-add-city-state-modal.html',
        controller: 'AddStateCityModalController',
        size: size,
        resolve: {
          neighborhoodId: function () {
            return null;
          }
        }
      });
      modalInstance.result.then(function (data) {
        $log.debug("results from modal: " + angular.toJson(data));
        citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData();
        //$scope.cityContentTableParams.reload();
      }, function () {
        $log.debug('Modal dismissed at: ' + new Date());
      });
    };




    $scope.deleteNeighborhoodFromCity = function (neighborhoodId, neighborhoodName) {
      $log.debug("delete neighborhood " + neighborhoodName + " w/ id " + neighborhoodId);
      $http.delete('/api/v1/neighborhoods/' + neighborhoodId + '?neighborhood=' + neighborhoodName)
        .success(function (data) {
          $log.debug("deleted neighborhood " + neighborhoodName);
          $scope.cityContentTableParams.reload();
        }).error(function (error) {
          var errorMsg = "error deleting neighborhood. " + error;
          alert(errorMsg);
          $log.error(errorMsg);
        });
    };

  })



  //
  // ========================== Modal - Add City, State  =================================
  //
  .controller('AddStateCityModalController', function ($scope, $modalInstance, $http, $log, geocoder) {

    $scope.neighborhood = {
      name: null,
      geo_name: null,
      city: null,
      state: null,
      level: 0,
      position: 1,
      path: '',
      parent_path: null,
      parent_name: null
    };
    /*
     "geometry": {
     "type": "Point",
     "coordinates": [
     -73.959721999999999298,
     40.790278000000000702
     ]
     },
     */

    $scope.ok = function () {
      if ($scope.neighborhood.city === null || $scope.neighborhood.state === null) {
        $log.error("null city or state.  nothing was added.");
        $modalInstance.close(null);
      }

      geocoder.codeAddress($scope.neighborhood.city + ', ' + $scope.neighborhood.state, function (err, data) {
        if (err) {
          $log.error("Error finding lat/lon for specified city. " + angular.toJson(err));
        } else {
          $log.debug("successfully geocoded city/state:  " + angular.toJson(data));
          $scope.neighborhood.lat = data.lat;
          $scope.neighborhood.long = data.long;
          $scope.neighborhood.city = data.city;
          $scope.neighborhood.name = data.city;
          $scope.neighborhood.geo_name = data.city;
          $log.debug("new neighborhood to add is:  " + angular.toJson($scope.neighborhood));

          $http.post('/api/v1/neighborhoodGeo', $scope.neighborhood)
            .success(function (data) {
              $log.info("added new neighborhood info: " + angular.toJson($scope.neighborhood));
              $modalInstance.close(data);
            })
            .error(function (err) {
              var errorMsg = "error adding new category info. " + (err && err.error ? err.error : '');
              $log.error(errorMsg);
              alert(errorMsg);
            });
        }
      });


    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.isInputValid = function () {
      return ($scope.neighborhood.city || '') !== '' &&
        ($scope.neighborhood.state || '') !== '';
    };


  })

  //
  // ========================== Modal - Add neighborhood to an existing city =================================
  //
  .controller('NeighborhoodAddToExistingStateCityModalController', function ($scope, $modalInstance, $http, $log, neighborhood) {
    $scope.parentNeighborhood = neighborhood;
    $scope.neighborhood = {
      parentId: neighborhood.id,
      city: neighborhood.city,
      state: neighborhood.state,
      parent_name: neighborhood.name,
      level: (neighborhood.level + 1),
      parent_path: neighborhood.path,
      position: 1
    };

    $scope.ok = function () {
      if (!$scope.neighborhood.name || $scope.neighborhood.name.trim() === '') {
        $log.error("Blank name!  No neighborhood will be added.");
        $modalInstance.close(null);
      }
      $scope.neighborhood.path = $scope.neighborhood.name.toLowerCase();

      $http.post('/api/v1/neighborhoodGeo', $scope.neighborhood)
        .success(function (data) {
          $log.info("added new neighborhood info: " + angular.toJson($scope.neighborhood));
          $modalInstance.close(data);
        })
        .error(function () {
          $log.error("error adding new category info.");
        });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.isInputValid = function () {
      return ($scope.neighborhood.city || '') !== '' &&
        ($scope.neighborhood.state || '') !== '' &&
        ($scope.neighborhood.name || '') !== '';
    };


  })




  //
  // ========================== Modal - Edit Lat/Lon for City =================================
  //
  .controller('EditCityLatLonModalController', function ($scope, $modalInstance, $http, $log, $location, geocoder, city) {

    $log.debug("EditCityLatLonModalController - city: " + angular.toJson(city));

    $scope.cityInfo = {};
    $scope.cityInfo.id = city.id;
    $scope.cityInfo.name = city.name;
    $scope.cityInfo.lat = city.lat;
    $scope.cityInfo.long = city.long;

    $scope.ok = function () {
      $modalInstance.close($scope.cityInfo);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    $scope.getHrefForGoogleMapWithLonLat = function () {
      return geocoder.getHrefForGoogleMapWithLonLat($scope.cityInfo);
    };

    $scope.isInputValid = function () {
      return ($scope.cityInfo.lat === null && $scope.cityInfo.long === null)
        || ($scope.cityInfo.lat === '' && $scope.cityInfo.long === '')
        || (parseFloat($scope.cityInfo.lat) && parseFloat($scope.cityInfo.long));
    };


  })







  // ==================================================================================================================
  // =================================     NeighborhoodsListController    =============================================
  // ==================================================================================================================

  .controller('NeighborhoodsListController', function ($scope, $routeParams, $http, $location, $log, ngTableParams, $modal, $filter, citiesAndNeighborhoodsManager) {

    //$log.debug('NeighborhoodsListController loading');

    $scope.GLOBAL_PENDING_NEIGHBORHOOD_NAME = '(PENDING)';

    $scope.allNeighborhoods = [];
    $scope.currentPageOfNeighborhoods = [];
    $scope.currentNeighborhoodId = $routeParams.id;
    $scope.currentNeighborhood = null;
    $scope.breadCrumbs = [];

    $scope.headline = "";

    $scope.citiesAndNeighborhoodsManager = citiesAndNeighborhoodsManager;

    $scope.poiCountEnabled = $location.search()['poiCount'];
    $scope.recalculatePOICount = function () {
      $log.debug("recalculatePOICount");
      var updateOperations = [];
      $scope.citiesAndNeighborhoodsManager.getAllData().forEach(function (nei) {
        if (nei.name === '(PENDING)') {
          return;
        }
        updateOperations.push(function (cb) {
          $log.debug("getting POI count for " + nei.name);
          $http.get('/api/v1/npc?neighGeoId=' + nei.id + '&isPortal=1')
            .success(function (data) {
              $log.debug("poi count response: " + angular.toJson(data));
              nei.poiCount = data.poi_count;
              cb(null, data);
            })
            .error(function (err) {
              nei.poiCount = err;
              cb("error. " + err, err);
            });
        });
      });
      async.series(updateOperations, function () {
        $log.debug("all done with POI count update.");
      });
    };

    var updateHeadline = function () {
      if ($scope.currentNeighborhood) {
        $scope.headline = "Neighborhoods for " + $scope.currentNeighborhood.name;
      } else {
        $scope.headline = "Neighborhoods...";
      }
    };

    var updateBreadcrumbModel = function () {
      var cityAndNeighborhoodChain = citiesAndNeighborhoodsManager.getBreadcrumbDescendants($scope.currentNeighborhood, []);
      cityAndNeighborhoodChain.pop();
      $scope.breadCrumbs = cityAndNeighborhoodChain;
    };

    var loadTableData = function (tableParams, $defer) {
      var data = citiesAndNeighborhoodsManager.getChildrenByParentId($scope.currentNeighborhoodId)
        , orderedData = null;

      angular.forEach(data, function (val) {
        val.childrenCount = citiesAndNeighborhoodsManager.countChildrenById(val.id);
      });

      orderedData = tableParams.sorting() ? $filter('orderBy')(data, tableParams.orderBy()) : data;
      $scope.allNeighborhoods = orderedData;
      tableParams.total(data.length);
      if (angular.isDefined($defer)) {
        $defer.resolve(orderedData);
      }
      $scope.currentPageOfNeighborhoods = orderedData.slice((tableParams.page() - 1) * tableParams.count(), tableParams.page() * tableParams.count());
    };

    $scope.$on('cityAndNeighborhoodInitComplete', function (e, value) {
      $scope.currentNeighborhood = citiesAndNeighborhoodsManager.getOneById($scope.currentNeighborhoodId);
      updateHeadline();
      loadTableData($scope.neighborhoodContentTableParams);
      updateBreadcrumbModel();
    });


    $scope.handleDeleteButtonClicked = function (id) {
      if (!id) {
        var errorMsg = "no id was specified.  neighborhood will not be deleted.";
        $log.error(errorMsg);
        alert(errorMsg);
        return;
      }
      $http.delete('/api/v1/neighborhoodGeo/' + id)
        .success(function (data) {
          $location.url('/cities/' + ($scope.currentNeighborhood.parentId || ''));
        })
        .error(function (error) {
          alert("error deleting neighborhood.  " + angular.toJson(error));
        });
    };

    $scope.formatGeoJSON = function (neighborhood) {
      if (neighborhood && neighborhood.geometry && neighborhood.geometry.type === "Polygon" && _.isArray(neighborhood.geometry.coordinates)) {
        return (neighborhood.geometry.coordinates[0].length - 1) + " sided polygon";
      }
      return '---';
    };

    $scope.goToNeighborhoodsList = function (neighborhood) {
      $location.url('/cities/' + neighborhood.id);
    };


    $scope.neighborhoodContentTableParams = new ngTableParams({
      page: 1,
      count: 50,
      sorting: {
        state: 'asc',
        name: 'asc'
      }
    }, {
      total: $scope.currentPageOfNeighborhoods.length,
      getData: function ($defer, params) {
        $scope.$on('cityAndNeighborhoodInitComplete', function (e, value) {
          updateHeadline();
          loadTableData(params, $defer);
        });
      }
    });

    citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData();

    $scope.handleClickAddNeighborhood = function () {
      var modalInstance = $modal.open({
        templateUrl: 'add-neighborhood-to-city-state-modal.html',
        controller: 'NeighborhoodAddToExistingStateCityModalController',
        size: 'sm',
        resolve: {
          neighborhood: function () {
            return $scope.currentNeighborhood;
          }
        }
      });
      modalInstance.result.then(function (data) {
        $log.debug("results from modal: " + angular.toJson(data));
        citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData($scope.currentNeighborhoodId);
      }, function () {
        $log.debug('Modal dismissed at: ' + new Date());
      });
    };


  });
