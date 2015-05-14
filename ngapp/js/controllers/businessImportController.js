"use strict";
/*global angular, _*/

angular.module('beaconApp.businessModule')

  //
  // ============================= Modal - Neighborhood Selection ===============================
  //
  .controller('BusinessImportController', function ($scope, $rootScope, $http, $log, geocoder, $timeout) {
    $log.debug('BusinessImportController loading...');

    $scope.headline = 'Google Places POI Importer Tool';
    $scope.business = {};
    $scope.searchCriteria = {text: ''};
    $scope.searchResults = [];

    $scope.poiDetails = null;
    $scope.markers = [];

    $scope.googleMap = {};

    $scope.manhattan = new google.maps.LatLng(40.7903, -73.9597);
    $scope.geocoder = new google.maps.Geocoder();
    $scope.transformedBusiness = {};

    $scope.importedPlaceIds = [];

    $scope.canBeImported = function (placeId) {
      return !_.contains($scope.importedPlaceIds, placeId);
    };

    $scope.openInfoWindows = [];

    // Add a marker to the map and push to the array.
    function addMarker(location) {
      $log.debug("adding marker for location: " + angular.toJson(location));
      var marker = new google.maps.Marker({
        position: location.geometry.location,
        map: $scope.googleMap,
        title: location.name
      }),
      contentForInfoWindow = '<div id="markerContent_' + location.place_id + '">'+
          '<h3>' + location.name + '</h3>'+
          '<div>'+
          '<p><b>Address: </b>' + (location.formatted_address || '') +
          '</p></div>'+
          '</div>',
      infoWindow = new google.maps.InfoWindow({
        content: contentForInfoWindow
      });
      $scope.markers.push(marker);
      google.maps.event.addListener(marker, 'click', function() {
        $log.debug("marker clicked for " + location.toString());
        var openWin = $scope.openInfoWindows.pop();
        while (openWin) {
          openWin.close();
          openWin = $scope.openInfoWindows.pop();
        }
        infoWindow.open($scope.googleMap, marker);
        $scope.openInfoWindows.push(infoWindow);
      });
    }

    // Sets the map on all markers in the array.
    function setAllMap(map) {
      for (var i = 0; i < $scope.markers.length; i++) {
        $scope.markers[i].setMap(map);
      }
    }

    // Removes the markers from the map, but keeps them in the array.
    function clearMarkers() {
      setAllMap(null);
    }

    // Shows any markers currently in the array.
    function showMarkers() {
      setAllMap(map);
    }

    // Deletes all markers in the array by removing references to them.
    function deleteMarkers() {
      clearMarkers();
      $scope.markers = [];
    }

    $scope.codeAddress = function () {
      var address = document.getElementById('address').value;
      $scope.geocoder.geocode( { 'address': address }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          $scope.googleMap.setCenter(results[0].geometry.location);
          $log.debug("location: [ lon: " + results[0].geometry.location.B ||results[0].geometry.location.D + ", lat: " + results[0].geometry.location.k);
          var marker = new google.maps.Marker({
            map: $scope.googleMap,
            position: results[0].geometry.location
          });
        } else {
          alert('Geocode was not successful for the following reason: ' + status);
        }
      });
    };

    // 'import all' button is disabled until all of the selected POIs have had their details loaded
    $scope.importAllDisabled = function () {
      return !_.all($scope.searchResults, function (val) {
        if (val.isSelected || angular.isDefined(val.detailedInfo)) {
          return !!val.detailedInfo;
        } else {
          return true;
        }
      });
    };

    $scope.isNewSearch = true;

    var checkForDuplicates = function (poiInfo, callback) {
      var lat, lon, name;
      $log.debug("checkForDuplicates - " + angular.toJson(poiInfo));

      lat = poiInfo.geometry.location.k;
      lon = poiInfo.geometry.location.B || poiInfo.geometry.location.D;
      name = poiInfo.name;
      $http.get('/api/v1/businesses_dupe_check?lat=' + lat + '&long=' + lon + "&name=" + name + "&place_id=" + poiInfo.place_id)
        .success(function (data) { callback(null, data); })
        .error(function (err) { callback(err, null); });
    };

    $scope.searchResultCallback = function callback(results, status, pagination) {
      $log.debug("searchResultCallback:  status: " + status + "\nresults:\n" + angular.toJson(results));
      $scope.poiDetails = null;
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        if ($scope.isNewSearch) {
          $scope.searchResults = results;
          deleteMarkers();
        } else {
          $scope.searchResults = ($scope.searchResults || []).concat(results);
        }
        for (var i = 0; i < results.length; i += 1) {
          // check for duplicates...
          var place = results[i];
          (function (thePlace) {
            checkForDuplicates(thePlace, function (err, data) {
              if (!err) {
                $log.debug((data || []).length + " possible duplicates found for " + thePlace.name);
                thePlace.possibleDuplicates = data || [];
                angular.forEach(thePlace.possibleDuplicates, function (v) {
                  if (v.place_id) {
                    $scope.importedPlaceIds.push(v.place_id);
                  }
                });
              }
            });
          })(place);
          addMarker(place);
        }
        if (pagination.hasNextPage) {
          $log.debug("another page of results exists.... fetching in 2 seconds.");
          $scope.isNewSearch = false;
          $timeout(function () {
            pagination.nextPage();
          }, 2100);
        }
      } else {
        $scope.searchResults = [];
      }
      $scope.$apply();
    };


    $scope.handleSearchButtonClick = function () {
      $log.debug("search clicked.  search text is: " + $scope.searchCriteria.text);
      $scope.isNewSearch = true;
      var request = {
        query: $scope.searchCriteria.text,
        bounds: $scope.googleMap.getBounds()
      };
      $scope.service.textSearch(request, $scope.searchResultCallback);
    };

    var renderPlaceDetails = function (rawPlaceDetails) {
      $scope.poiDetails = rawPlaceDetails;
      $log.debug("results: " + angular.toJson(rawPlaceDetails));
      $scope.transformedBusiness = $scope.transformPOIDetailsToBusiness(rawPlaceDetails);
      geocoder.getNeighborhoodsForLonLat($scope.transformedBusiness.long, $scope.transformedBusiness.lat, function (err, data) {
        if (err) {
          $log.debug("Unable to determine neighborhood for this business. " + angular.toJson(err));
        } else {
          if (_.isEmpty(data)) {
            $log.debug("no neighborhoods were found at lon/lat " + $scope.transformedBusiness.long + ', ' + $scope.transformedBusiness.lat);
          } else {
            $log.debug("neighborhood(s) were found! \n" + angular.toJson(data));
            $scope.transformedBusiness.neighborhoods = _.pluck(data, 'name');
            $scope.transformedBusiness.neighborhoodGeoIds = geocoder.xformToNeighborhoodGeoIds(data);
            $scope.transformedBusiness.city = data[0].city;
            $scope.transformedBusiness.state = data[0].state;
          }
        }
      });
    };

    var lookupNeighborhoodAndSetInPlaceDetails = function (place, cb) {
      if (place) {
        $log.debug("lookupNeighborhoodAndSetInPlaceDetails: \n" + angular.toJson(place));
        var lat = place.geometry.location.k,
          long = place.geometry.location.B || place.geometry.location.D;
        geocoder.getNeighborhoodsForLonLat(long, lat, function (err, data) {
          if (err) {
            $log.debug("Unable to determine neighborhood for this business. " + angular.toJson(err));
//            $scope.$apply();
          } else {
            if (_.isEmpty(data)) {
              $log.debug("no neighborhoods were found at lon/lat " + place.long + ', ' + place.lat);
            } else {
              $log.debug("neighborhood was found! \n" + angular.toJson(data));
              place.neighborhoods = [data[0].name];
              place.neighborhoodGeoIds = geocoder.xformToNeighborhoodGeoIds(data);
              place.city = data[0].city;
              place.city = data[0].state;
            }
//            $scope.$apply();
          }
        });
        if (angular.isFunction(cb)) {
          cb();
        }
      }
    };

    var getDetailsAndRenderCallback = function(place, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        renderPlaceDetails(place);
      } else {
        $log.debug("error getting details: " + angular.toJson(status));
      }
    };

    var getDetailsAndCacheCallback = function(place, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {
        var poiResult = _.find($scope.searchResults, function (poi) {
          return place.place_id === poi.place_id;
        });
        if (poiResult) {
          poiResult.detailedInfo = place;
          $log.debug("successfully retrieved POI detailed info:\n" + angular.toJson(place));
          lookupNeighborhoodAndSetInPlaceDetails(place, function () {
            $scope.$apply($scope.importAllDisabled);
          });
        }
      } else {
        $log.debug("error getting details: " + angular.toJson(status));
      }
    };

    $scope.anyPOIsSelected = function () {
      return _.any($scope.searchResults, function (val) {
        return val.selected;
      });
    };

    $scope.importSelected = function () {
      $log.debug("importSelected");
      var selectedItems = _.select($scope.searchResults, function (val) {
        return val.selected;
      });
      $log.debug("selectedItems: " + angular.toJson(selectedItems));

      var ajaxPosts = [];

      angular.forEach(selectedItems, function (val) {
        ajaxPosts.push(function (cb) {
          $scope.importPOIFromSearchResultWithDetails(val, cb);
        });
      });

      var allDone = function (err, results) {
        if (err) {
          $log.error("Error importing all of the selected items. " + err);
        } else {
          $log.debug("Successfully imported all selected items");
        }
        //$scope.$apply();
      };
      async.series(ajaxPosts, allDone);
    };

    var retrievePlaceDetailsWithCallback = function (placeId, callback) {
      $log.debug("checkbox clicked for place_id " + placeId);
      var poiResult = _.find($scope.searchResults, function (poi) {
        return placeId === poi.place_id;
      });
      poiResult.detailedInfo = null;
      if (poiResult && !poiResult.detailedInfo) {
        var request = {
          placeId: placeId
        };
        $scope.service.getDetails(request, callback);
      } else {
        $log.debug("skipping details retrieval for placeId " + placeId);
      }
    };

    $scope.handlePoiResultCheckboxClicked = function (placeId) {
      retrievePlaceDetailsWithCallback(placeId, getDetailsAndCacheCallback);
    };

    $scope.handlePoiResultClicked = function (placeId) {
      retrievePlaceDetailsWithCallback(placeId, getDetailsAndRenderCallback);
    };

    function nullSafeLongShortName(val) {
      if (val) {
        if (angular.isDefined(val.long_name)) {
          return val.long_name;
        } else if (angular.isDefined(val.short_name)) {
          return val.short_name;
        }
      }
      return '';
    }

    function nullSafeShortName(val) {
      if (val && angular.isDefined(val.short_name)) {
          return val.short_name;
      }
      return '';
    }

    $scope.selectedCategoryInfo = {categoryId: null, categoryTypeId: null, categorySubTypeId: null};

    $scope.updateCategorySelection = function () {
      $scope.transformedBusiness.categoryIds = $scope.selectedCategoryInfo.categoryId ? [$scope.selectedCategoryInfo.categoryId] : [];
    };

    $scope.transformPOIDetailsToBusiness = function (poi) {
      var state = nullSafeShortName(_.find(poi.address_components, function (val) {
        return angular.isDefined(val.types) && _.contains(val.types, 'administrative_area_level_1') && _.contains(val.types, 'political');
      }));
      var city = nullSafeLongShortName(_.find(poi.address_components, function (val) {
        return angular.isDefined(val.types) &&
          (   (_.contains(val.types, 'locality') && _.contains(val.types, 'political'))
           || (_.contains(val.types, 'sublocality_level_1') && _.contains(val.types, 'sublocality') && _.contains(val.types, 'politicalXXXXX'))
          );
      }));
      var zipCode = nullSafeLongShortName(_.find(poi.address_components, function (val) {
        return angular.isDefined(val.types) && _.contains(val.types, 'postal_code');
      }));
      var streetName = nullSafeLongShortName(_.find(poi.address_components, function (val) {
        return angular.isDefined(val.types) && _.contains(val.types, 'route');
      }));
      var streetNumber = nullSafeLongShortName(_.find(poi.address_components, function (val) {
        return angular.isDefined(val.types) && _.contains(val.types, 'street_number');
      }));
      var addr1 = streetNumber + ' ' + streetName;
      if (addr1.trim() === '') {
        var indexOfFirstComma = poi.formatted_address.indexOf(',');
        addr1 = poi.formatted_address.substring(0, indexOfFirstComma === -1 ? poi.formatted_address.length : indexOfFirstComma);
      }
      var business = {
        published: true,
        name: poi.name,
        lat: poi.geometry.location.k,
        long: poi.geometry.location.B || poi.geometry.location.D,
        addr1: addr1 || '',
        addr2: '',
        city: city || '',
        state: state || '',
        zip: zipCode || '',
        phone: poi.formatted_phone_number || '',
        website: poi.website,
        description1: '',
        description2: '',
        cost: poi.price_level,
        import_src: "google_places",
        place_id: poi.place_id,
        rating: poi.rating,
        rating_google: poi.rating,
        categoryIds: $scope.categoryIds,
        categoryTypeIds: $scope.categoryTypeIds,
        categorySubTypeIds: $scope.categorySubTypeIds,
        openingHours: poi.opening_hours ? poi.opening_hours.periods : [],
        imported_data: {
          google_places: poi
        }
      };
      if (angular.isArray(poi.neighborhoods) && poi.neighborhoods.length > 0) {
        business.neighborhoods = poi.neighborhoods;
      }
      if (angular.isArray(poi.neighborhoodGeoIds) && poi.neighborhoodGeoIds.length > 0) {
        business.neighborhoodGeoIds = poi.neighborhoodGeoIds;
      }
      return business;
    };

    $scope.importPOIFromSearchResultWithDetails = function (searchResult, callback) {
      var transformedPOI = $scope.transformPOIDetailsToBusiness(searchResult.detailedInfo);
      $http.post('/api/v1/businesses', transformedPOI)
        .success(function (data) {
          $scope.importedPlaceIds.push(transformedPOI.place_id);
          $log.info("successfully imported " + transformedPOI.name);
          var poiResult = _.find($scope.searchResults, function (poi) {
            return searchResult.place_id === poi.place_id;
          });
          poiResult.selected = false;
          callback(null, data);
        })
        .error(function (err) {
          var errorMsg = "error importing " + transformedPOI.name;
          $log.error(errorMsg);
          callback(errorMsg, null);
        });
    };


    $scope.importPOI = function () {
      $log.debug("importing POI...\n" + angular.toJson($scope.transformedBusiness));
      $http.post('/api/v1/businesses', $scope.transformedBusiness)
        .success(function (data) {
          $scope.importedPlaceIds.push($scope.transformedBusiness.place_id);
          $log.info("created new business successfully");
          alert($scope.transformedBusiness.name + " imported successfully!");
        })
        .error(function () {
          alert("Error importing " + $scope.transformedBusiness.name);
          $log.error("error adding new business");
        });
    };

    $scope.catSelectionsModel = {};
    $scope.catTypeSelectionsModel = {};
    $scope.catSubTypeSelectionsModel = {};

    $scope.categoryIds = [];
    $scope.categoryTypeIds = [];
    $scope.categorySubTypeIds = [];

    $scope.updateBusinessCategoriesFromTreeModel = function (id) {
      $log.debug("updateBusinessCategoriesFromTreeModel...");
      var selectedCategoryIds = [],
        selectedCategoryTypeIds = [],
        selectedCategorySubTypeIds = [];
      _.each($scope.catSelectionsModel, function (val, key) {
        if (val) {
          selectedCategoryIds.push(key);
        }
      });
      _.each($scope.catTypeSelectionsModel, function (val, key) {
        if (val) {
          selectedCategoryTypeIds.push(key);
        }
      });
      _.each($scope.catSubTypeSelectionsModel, function (val, key) {
        if (val) {
          selectedCategorySubTypeIds.push(key);
        }
      });
      if (id.length === 24) {
        $log.debug("cat value is " + $scope.catSelectionsModel[id]);
        if (!$scope.catSelectionsModel[id]) { // if category is unchecked
          _.each($scope.catTypeSelectionsModel, function (val, key) {
            if (key.indexOf(id) === 0) {
              $scope.catTypeSelectionsModel[key] = false;
            }
          });
          _.each($scope.catSubTypeSelectionsModel, function (val, key) {
            if (key.indexOf(id) === 0) {
              $scope.catSubTypeSelectionsModel[key] = false;
            }
          });
        }
      } else if (id.length === 49) {
        $log.debug("cat type value is " + $scope.catTypeSelectionsModel[id]);
        if (!$scope.catTypeSelectionsModel[id]) { // if category type is unchecked
          _.each($scope.catSubTypeSelectionsModel, function (val, key) {
            if (key.indexOf(id) === 0) {
              $scope.catSubTypeSelectionsModel[key] = false;
            }
          });
        }
      } else if (id.length === 74) {
        $log.debug("cat sub type value is " + $scope.catSubTypeSelectionsModel[id]);
      } else {
        $log.warn("unknown cat id type.  unexpected length");
      }

      _.each($scope.catSubTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.categorySubTypeIds.push(key);
        }
      });

      _.each($scope.catTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.categoryTypeIds.push(key);
        }
      });

      _.each($scope.catSelectionsModel, function (val, key) {
        if (val) {
          $scope.categoryIds.push(key);
        }
      });
    };


    var init = function () {
      console.log("init called...");
      var mapElement = document.getElementById('map');
      $scope.googleMap = new google.maps.Map(mapElement, {
        center: $scope.manhattan,
        zoom: 12
      });
      $scope.service = new google.maps.places.PlacesService($scope.googleMap);
    };
    init();
  });