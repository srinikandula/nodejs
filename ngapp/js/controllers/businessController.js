"use strict";
/*global angular, _*/

angular.module('beaconApp.businessModule', ['ngAnimate', 'ngTouch', 'ngTable', 'angularFileUpload', 'ui.bootstrap'])


  //
  // ============================= Modal - Conditions  ===============================
  //
  .controller('BusinessesConditionsModalController', function ($scope, business, availableValues, $modalInstance, $http, $log) {
    $log.debug("modal popup -- business: " + angular.toJson(business));
    $scope.business = business;
    $scope.availableValues = availableValues;

    var createCompositeCondition = function (conditionObject, existingCondition) {
      if (!conditionObject) {
        return null;
      }
      var providerPrice, providerDescription, isPublished = null, composite = null;
      if (existingCondition) {
        providerPrice = existingCondition.providerPrice;
        providerDescription = existingCondition.providerDescription;
        isPublished = existingCondition.published;
      }
      composite = _.extend(conditionObject, {});
      composite.providerPrice = providerPrice;
      composite.providerDescription = providerDescription;
      composite.published = !!isPublished;
      return composite;
    };

    var createCompositeValuesList = function (business, allConditions) {
      var composites = [];
      _.each(allConditions, function (conditionObject) {
        var existingCondition, composite;
        if (business.conditionData) {
          existingCondition = _.find(business.conditionData, function (value) {
            return value.id === conditionObject.id;
          });
        }
        composite = createCompositeCondition(conditionObject, existingCondition);
        composites.push(composite);
      });
      $log.debug("composites (pre-sort) is: " + angular.toJson(composites));
      composites.sort(function (a, b) {
        return a > b;
      });
      return composites;
    };

    $scope.compositeDataModel = createCompositeValuesList($scope.business, $scope.availableValues);

    $scope.ok = function () {
      $log.debug("$scope.compositeDataModel is : " + angular.toJson($scope.compositeDataModel));
      if (!angular.isDefined($scope.business.id) || $scope.business.id === null) {
        $log.debug("business is not saved (no id), so dismissing dialog without saving to db.");
        $modalInstance.close($scope.compositeDataModel);
      } else {
        $http.post('/api/v1/businesses/' + $scope.business.id + '/conditions', {conditionData: $scope.compositeDataModel})
          .success(function (data) {
            $log.debug("successfully updated condition data.  " + angular.toJson(data));
            $modalInstance.close($scope.compositeDataModel);
          }).error(function (err) {
            $log.error("error updating condition data.  " + angular.toJson(err));
          });
      }
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  })






  //
  // ============================= Modal - Procedures  ===============================
  //
  .controller('BusinessesProceduresModalController', function ($scope, business, availableValues, $modalInstance, $http, $log) {
    $log.debug("modal popup -- business: " + angular.toJson(business));
    $scope.business = business;
    $scope.availableValues = availableValues;

    var createCompositeProcedure = function (procedureObject, existingProcedure) {
      if (!procedureObject) {
        return null;
      }
      var providerPrice, providerDescription, isPublished = null, composite = null;
      if (existingProcedure) {
        providerPrice = existingProcedure.providerPrice;
        providerDescription = existingProcedure.providerDescription;
        isPublished = existingProcedure.published;
      }
      composite = _.extend(procedureObject, {});
      composite.providerPrice = providerPrice;
      composite.providerDescription = providerDescription;
      composite.published = !!isPublished;
      return composite;
    };

    var createCompositeValuesList = function (business, allProcedures) {
      var composites = [];
      _.each(allProcedures, function (procedureObject) {
        var existingProcedure, composite;
        if (business.procedureData) {
          existingProcedure = _.find(business.procedureData, function (value) {
            return value.id === procedureObject.id;
          });
        }
        composite = createCompositeProcedure(procedureObject, existingProcedure);
        composites.push(composite);
      });
      $log.debug("composites (pre-sort) is: " + angular.toJson(composites));
      composites.sort(function (a, b) {
        return a > b;
      });
      return composites;
    };

    $scope.compositeDataModel = createCompositeValuesList($scope.business, $scope.availableValues);

    $scope.ok = function () {
      $log.debug("$scope.compositeDataModel is : " + angular.toJson($scope.compositeDataModel));
      if (!angular.isDefined($scope.business.id) || $scope.business.id === null) {
        $log.debug("business is not saved (no id), so dismissing dialog without saving to db.");
        $modalInstance.close($scope.compositeDataModel);
      } else {
        $http.post('/api/v1/businesses/' + $scope.business.id + '/procedures', {procedureData: $scope.compositeDataModel})
          .success(function (data) {
            $log.debug("successfully updated procedure data.  " + angular.toJson(data));
            $modalInstance.close($scope.compositeDataModel);
          }).error(function (err) {
            $log.error("error updating procedure data.  " + angular.toJson(err));
          });
      }
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  })






  //
  // ============================= Modal - NeighborhoodGeo Selection ===============================
  //
  .controller('BusinessesNeighborhoodGeoModalController', function ($scope, business, availableNeighborhoods, $modalInstance, $http, $log, citiesAndNeighborhoodsManager) {
    $log.debug("modal popup -- business: " + angular.toJson(business));
    $scope.business = business;

    var buildNeighborhoodsTree = function (neighArray) {
      if (!neighArray) {
        return neighArray;
      }
      angular.forEach(neighArray, function (val) {
        if (val) {
          delete val.geometry;
          val.selected = (business && !_.isEmpty(business.neighborhoodGeoIds) && _.contains(business.neighborhoodGeoIds, val.id));
          val.children = citiesAndNeighborhoodsManager.getChildrenByParentId(val.id);
          buildNeighborhoodsTree(val.children);
        }
      });
      return neighArray;
    };

    $scope.availableNeighborhoods = buildNeighborhoodsTree(availableNeighborhoods);

    $scope.selectedNeighborhoodGeoIds = [];
    $scope.selectedNeighborhoodNames = [];

    $scope.ok = function () {
      $scope.selectedNeighborhoodGeoIds = [];
      $scope.selectedNeighborhoodNames = [];
      var requestParams,
        collectSelectedIds = function (neighborhood) {
          if (neighborhood && neighborhood.selected) {
            $scope.selectedNeighborhoodGeoIds.push(neighborhood.id);
            $scope.selectedNeighborhoodNames.push(neighborhood.name);
          }
          if (neighborhood && !_.isEmpty(neighborhood.children)) {
            angular.forEach(neighborhood.children, collectSelectedIds);
          }
        };
      angular.forEach($scope.availableNeighborhoods, collectSelectedIds);

      requestParams = {
        neighborhoodGeoIds: $scope.selectedNeighborhoodGeoIds,
        neighborhoods: $scope.selectedNeighborhoodNames.sort(),
        neighborhoodsDisplayValue: $scope.selectedNeighborhoodNames.sort().join(', ')
      };
      if (!angular.isDefined($scope.business.id) || $scope.business.id === null) {
        $log.debug("business is not saved (no id), so dismissing dialog without saving to db.");
        $modalInstance.close(requestParams);
      } else {
        $http.put('/api/v1/businesses/' + $scope.business.id + '/neighborhoods', requestParams)
          .success(function (data) {
            $log.debug("successfully updated neighborhoods.  " + angular.toJson(data));
            $modalInstance.close(requestParams);
          }).error(function (err) {
            var errorMsg = "error updating neighborhoods.  " + angular.toJson(err);
            $log.error(errorMsg);
            alert(errorMsg);
          });
      }
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };


    var deselectAllInNeighborhoodTree = function (neighborhood) {
      if (neighborhood) {
        neighborhood.selected = false;
        if (!_.isEmpty(neighborhood.children)) {
          angular.forEach(neighborhood.children, deselectAllInNeighborhoodTree);
        }
      }
    };

    $scope.handleNeighborhoodSelectionChanged = function (neighborhoodGeo) {
      if (neighborhoodGeo && !neighborhoodGeo.selected && !_.isEmpty(neighborhoodGeo.children)) {
        deselectAllInNeighborhoodTree(neighborhoodGeo);
      }
    };

  })



  //
  // ============================= Modal - Generic Classification Selection ===============================
  //
  .controller('BusinessesGenericClassificationModalController', function ($scope, business, availableValues, businessPropertyName, numOfColumns, classificationDisplayName, $modalInstance, $log) {
    $log.debug("modal popup -- business: " + angular.toJson(business) + "\navailableValues: " + angular.toJson(availableValues) + "\nbusinessPropertyName: " + businessPropertyName);
    $scope.business = business;
    $scope.originalValueList = business[businessPropertyName] || [];
    var desiredNumberOfColumns = numOfColumns;
    $scope.numberOfColumnsOfValues = (availableValues || []).length >= desiredNumberOfColumns ? desiredNumberOfColumns : 1;
    $scope.classificationDisplayName = classificationDisplayName;

    $scope.getNumberArray = function (n) {
      return _.range(n);
    };

    function columnReorder(list, numOfCols) {
      var i, j,
        columnArrays = [],
        numberOfRows,
        rowsArrays = [],
        columnValues = [];

      numberOfRows = Math.ceil(list.length / numOfCols);
      for (i = 0; i < numOfCols; i += 1) {
        columnArrays[i] = list.slice(i * numberOfRows, (i + 1) * numberOfRows);
      }

      for (i = 0; i < numberOfRows; i += 1) {
        columnValues = [];
        for (j = 0; j < numOfCols; j += 1) {
          columnValues.push(columnArrays[j][i]);
        }
        rowsArrays.push(columnValues);
      }
      return rowsArrays;
    }

    $scope.availableValuesRaw = availableValues; // an array of objects, which have 'id' and 'name' fields
    $scope.availableValues = columnReorder(availableValues || [], $scope.numberOfColumnsOfValues);

    $scope.shouldBeChecked = function (value) {
      return _.contains($scope.originalValueList, value);
    };

    $scope.selectableValuesModel = {};
    angular.forEach($scope.availableValuesRaw, function (val) {
      $scope.selectableValuesModel[val.id] = $scope.shouldBeChecked(val.id);
    });

    $scope.ok = function () {
      var selectedValueNames = _.compact(_.map($scope.selectableValuesModel, function (val, key) {
        return val ? key : null;
      }));
      $log.debug("selectedValueNames is : " + angular.toJson(selectedValueNames));
      $modalInstance.close(selectedValueNames);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  })




  //
  // ======================== Edit Business / Image Upload =============================
  //
  .controller('BusinessController', function ($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams, categoriesManager, classificationsManager, states, $upload, businessNavHelper, $modal, geocoder, infoOverlay, citiesAndNeighborhoodsManager, googlePlaces) {

    $scope.headline = "Edit Business";
    $scope.businessId = $routeParams.id;
    $log.debug("businessId from routeParams is: " + $scope.businessId);
    $scope.business = {};
    $scope.saveButtonText = 'Save Business';
    $scope.isAdd = false;

    $scope.businessHelper = businessNavHelper;

    $scope.editIndex = parseInt($routeParams.idx, 10);
    $scope.isNotPublished = false;
    $scope.isPublished = true;
    $scope.states = states;
    $scope.totalResults = businessNavHelper.completeResults.length;

    $scope.catSelectionsModel = {};
    $scope.catTypeSelectionsModel = {};
    $scope.catSubTypeSelectionsModel = {};

    $scope.cityStateNeighborhoodGeo = null;
    $scope.isListOrHierarchy = classificationsManager.isListOrHierarchy;

    categoriesManager.reloadCategoryData();
    classificationsManager.reloadClassificationData();

    $scope.fetchNeighborhoodGeoForCityState = function (city, state, callback) {
      $log.debug("fetchNeighborhoodGeoForCityState: " + city + ", " + state);
      $http.get('/api/v1/city?city=' + city + '&state=' + state)
        .success(function (data) {
          //$log.debug("fetchNeighborhoodGeoForCityState - data was: " + angular.toJson(data));
          $scope.cityStateNeighborhoodGeo = angular.isArray(data) && data.length > 0 ? data[0] : (_.isEmpty(data) ? null : data);
          if (angular.isFunction(callback)) {
            callback(null, $scope.cityStateNeighborhoodGeo);
          }
        })
        .error(function (err) {
          $scope.cityStateNeighborhoodGeo = null;
          alert("error fetching city/state neighborhoodGeo information.");
          callback(err, null);
        });
    };

    $scope.getNeighborhoodNamesArray = function () {
      if ($scope.business && $scope.business.neighborhoodGeoIds) {
        return citiesAndNeighborhoodsManager.getNamesByIds($scope.business.neighborhoodGeoIds);
      }
      return [];
    };

    $scope.reloadBusiness = function () {
      $http.get('/api/v1/businesses/' + $scope.businessId + '?includeImportedDetails=true').success(function (business) {
        $log.info("Loaded business id: " + business.id + " - " + business.name);
        if (!business.hasOwnProperty('published')) {
          business.published = true;
        }
        $scope.business = business;
        $scope.updateCategoryModelsFromBusiness();
      }).error(function (error) {
        $log.error("Failed to get business by id: " + $scope.businessId);
      });
    };

    $scope.reloadBusiness();

    $scope.isClassificationInputEnabled = function (classificationId) {
      var associatedClassificationIds = [];
      if (_.isEmpty($scope.business.categoryIds)) {
        return false;
      }
      _.each($scope.business.categoryIds, function (categoryId) {
        var acIds = ($rootScope.categoriesMap[categoryId] || {}).associatedClassificationIds || [];
        associatedClassificationIds = associatedClassificationIds.concat(acIds);
      });
      associatedClassificationIds = _.uniq(associatedClassificationIds);
      return _.contains(associatedClassificationIds, classificationId);
    };

    $scope.rawPhotos = [];
    $scope.photos = [];
    $scope.refreshPhotos = function () {
      $scope._Index = 0;
      $http.get('/api/v1/businesses/' + $scope.businessId + '/images').success(function (images) {
        $scope.rawPhotos = images;
        $scope.photos = [];
        if (images) {
          angular.forEach(images, function (img) {
            var imgDesc = img.description && img.description !== '' ? img.description : img.name;
          $scope.photos.push({src: img.url, desc: imgDesc, id: img.id, is_system_default: img.is_system_default});
          });
        }
      });
    };
    $scope.refreshPhotos();

    $scope.neighborhoodOptions = [];
    $scope.getNeighborhoodOptions = function (state, city, callback) {
      if (city && state) {
        $scope.fetchNeighborhoodGeoForCityState(city, state, function (err, data) {
          if (err) {
            if (angular.isFunction(callback)) {
              callback(err, null);
            }
          } else if (!data || !$scope.cityStateNeighborhoodGeo) {
            $log.debug("No city/state data..");
            $scope.neighborhoodOptions = [];
            callback(null, $scope.neighborhoodOptions);
          } else {
            $log.debug("$scope.cityStateNeighborhoodGeo is " + angular.toJson($scope.cityStateNeighborhoodGeo));
            citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData($scope.cityStateNeighborhoodGeo.id, true, true, function (err, data) {
              $scope.neighborhoodOptions = citiesAndNeighborhoodsManager.getChildrenByParentId($scope.cityStateNeighborhoodGeo.id);
              if (angular.isFunction(callback)) {
                callback(err, data);
              }
            });
          }
        });
      }
    };

    $scope.editNeighborhoodsForBusiness = function (size) {
      $scope.getNeighborhoodOptions($scope.business.state, $scope.business.city, function (err, data) {
        if (err) {
          $log.error("error getting neighborhood options prior to modal popup");
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-neighborhoodsGeo-modal.html',
            controller: 'BusinessesNeighborhoodGeoModalController',
            size: size,
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableNeighborhoods: function () {
                return angular.isArray($scope.neighborhoodOptions) ? $scope.neighborhoodOptions.sort() : $scope.neighborhoodOptions;
              }
            }
          });

          modalInstance.result.then(function (data) {
            $scope.business.neighborhoods = data.neighborhoods || [];
            $scope.business.neighborhoodGeoIds = data.neighborhoodGeoIds || [];
            $scope.business.neighborhoodDisplayValue = $scope.business.neighborhoods.sort().join(', ');
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };

    $scope.getConditions = function (cb) {
      $http.get('/api/v1/conditions').success(function (data) {
        $scope.conditions = data || [];
        if (angular.isFunction(cb)) {
          cb(null, $scope.conditions);
        }
      }).error(function (error) {
        var errorMsg = "Error getting conditions. " + error;
        $log.info(errorMsg);
        if (angular.isFunction(cb)) {
          cb(error, null);
        }
      });
    };

    $scope.getProcedures = function (cb) {
      $http.get('/api/v1/procedures').success(function (data) {
        $scope.procedures = data || [];
        if (angular.isFunction(cb)) {
          cb(null, $scope.procedures);
        }
      }).error(function (error) {
        var errorMsg = "Error getting procedures. " + error;
        $log.info(errorMsg);
        if (angular.isFunction(cb)) {
          cb(error, null);
        }
      });
    };


    $scope.onClickEditConditions = function () {
      $scope.getConditions(function (err, conditions) {
        if (err) {
          $log.error(err);
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-conditions-modal.html',
            controller: 'BusinessesConditionsModalController',
            size: 'lg',
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableValues: function () {
                return conditions;
              }
            }
          });

          modalInstance.result.then(function (data) {
            $log.debug("reloading business after editing conditions");
            $scope.reloadBusiness();
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };

    $scope.onClickEditProcedures = function () {
      $scope.getProcedures(function (err, procedures) {
        if (err) {
          $log.error(err);
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-procedures-modal.html',
            controller: 'BusinessesProceduresModalController',
            size: 'lg',
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableValues: function () {
                return procedures;
              }
            }
          });

          modalInstance.result.then(function (data) {
            $log.debug("reloading business after editing procedures");
            $scope.reloadBusiness();
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };

    /**
     * returns a string or array of strings containing the name(s) of the classification type(s)
     * @param classificationId the string id of the classification
     * @param classificationTypeIds a string id or an array of string ids
     */
    $scope.getNameForClassificationTypeId = function (classificationId, classificationTypeIds) {
      if (!$rootScope.classificationTypes) {
        return null;
      }
      var classTypes = $rootScope.classificationTypes[classificationId],
        classTypeObjs = [];
      if (!classificationId || !classificationTypeIds) {
        return null;
      }
      if (angular.isArray(classificationTypeIds)) {
        classTypeObjs = _.map(classificationTypeIds, function (ctId) {
          return $rootScope.classificationTypesMap[ctId];
        });
        return _.pluck(_.compact(classTypeObjs), 'name');
      }
      return classTypes[classificationTypeIds];
    };

    $scope.getClassificationTypeNames = function (classificationId, classificationTypeIds) {
      if (_.isEmpty(classificationTypeIds) || !angular.isArray(classificationTypeIds)) {
        return [];
      }
      var namesUnsorted = $scope.getNameForClassificationTypeId(classificationId, classificationTypeIds);
      return _.compact(namesUnsorted || []).sort();
    };


    $scope.onClickEditMultipleClassificationProperty = function (classificationId, businessPropertyName, numOfColumns, size) {
      classificationsManager.reloadClassificationData(function (err, data) {
        if (err) {
          $log.error("error loading classification data. " + err);
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-generic-classification-modal.html',
            controller: 'BusinessesGenericClassificationModalController',
            size: size,
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableValues: function () {
                return $rootScope.classificationTypes[classificationId];
              },
              businessPropertyName: function () {
                return businessPropertyName;
              },
              numOfColumns: function () {
                return numOfColumns;
              },
              classificationDisplayName: function () {
                return $rootScope.classificationsMap[classificationId].name;
              }
            }
          });

          modalInstance.result.then(function (data) {
            $scope.business[businessPropertyName] = data;
            $scope.businessForm.$setDirty(true);
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };

    /**
     * Saves the current business and refreshes the page.
     * @param nextIndexToEdit an OPTIONAL parameter that is the index of the
     * next business to edit, assuming that the current business is saved successfully.
     */
    $scope.saveButtonClicked = function (nextIndexToEdit) {
      $log.debug("saveButtonClicked -- nextIndexToEdit = " + nextIndexToEdit);
      $http.put('/api/v1/businesses/' + $scope.businessId, $scope.business)
        .success(function (data) {
          $log.info("saved changes to business successfully");
          infoOverlay.displayInfo("Changes saved successfully");
          if (nextIndexToEdit || ($scope.editIndex && !_.isEmpty(businessNavHelper.completeResults))) {
            businessNavHelper.editBusinessAtIndex(nextIndexToEdit || $scope.editIndex);
          } else {
            businessNavHelper.editBusinessById($scope.businessId);
          }
        })
        .error(function () {
          infoOverlay.displayInfo("error saving changes to business.");
          $log.error("error saving changes to business.");
        });
    };
    $scope.deleteButtonClicked = function () {
      $http.delete('/api/v1/businesses/' + $scope.businessId)
        .success(function (data) {
          $log.info("deleted business " + $scope.businessId);
          $location.url('/businesses');
        })
        .error(function () {
          $log.error("error deleting the business.");
        });
    };

    $scope.previousBusiness = function () {
      if ($scope.businessForm.$dirty) {
        $log.debug("previous clicked -- dirty form, saving");
        $scope.saveButtonClicked($scope.editIndex - 1);
        return;
      } else {
        $log.debug("not dirty.....");
      }
      businessNavHelper.editBusinessAtIndex($scope.editIndex - 1);
    };

    $scope.nextBusiness = function () {
      if ($scope.businessForm.$dirty) {
        $log.debug("next clicked -- dirty form, saving");
        $scope.saveButtonClicked($scope.editIndex + 1);
        return;
      } else {
        $log.debug("not dirty...");
      }
      businessNavHelper.editBusinessAtIndex($scope.editIndex + 1);
    };

    $scope.goBackToFilteredResults = function () {
      var newLocation = businessNavHelper.urlWithQueryParams.split('/').slice(4).join('/');
      $log.debug("going back to: " + newLocation);
      $location.url(newLocation);
    };

    $scope.combinedCategoryInfo = function () {
      var validCatIds = _.select($scope.business.categoryIds, function (val) {
        return angular.isDefined($rootScope.categoriesMap[val]);
      }),
        validCatTypeIds = _.select($scope.business.categoryTypeIds, function (val) {
          return angular.isDefined($rootScope.categoryTypesMap[val.substring(25)]);
        }),
        validCatSubTypeIds = _.select($scope.business.categorySubTypeIds, function (val) {
          return angular.isDefined($rootScope.categorySubTypesMap[val.substring(50)]);
        }),
        all = _.union(validCatIds, validCatTypeIds, validCatSubTypeIds).sort(),
        allFiltered = [],
        i,
        j,
        val1,
        val2,
        isSubstring;
      for (i = 0; i < all.length; i++) {
        isSubstring = false;
        val1 = all[i];
        for (j = 0; j < all.length; j++) {
          val2 = all[j];
          if (i !== j && val2.indexOf(val1) === 0) {
            isSubstring = true;
            break;
          }
        }
        if (!isSubstring) {
          allFiltered.push(val1);
        }
      }
      return allFiltered;
    };

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

      $scope.business.categorySubTypeIds = [];
      _.each($scope.catSubTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categorySubTypeIds.push(key);
        }
      });

      $scope.business.categoryTypeIds = [];
      _.each($scope.catTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categoryTypeIds.push(key);
        }
      });

      $scope.business.categoryIds = [];
      _.each($scope.catSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categoryIds.push(key);
        }
      });
    };

    $scope.updateCategoryModelsFromBusiness = function () {
      _.each($scope.business.categoryIds, function (id) {
        $scope.catSelectionsModel[id] = true;
      });
      _.each($scope.business.categoryTypeIds, function (id) {
        $scope.catTypeSelectionsModel[id] = true;
      });
      _.each($scope.business.categorySubTypeIds, function (id) {
        $scope.catSubTypeSelectionsModel[id] = true;
      });
    };

    var gt = ' <span class="glyphicon glyphicon-chevron-right"></span> ';

    $scope.displayValueForCategory = function (categoryId) {
      return $rootScope.categoriesMap[categoryId].name;
    };

    $scope.displayValueForCategoryType = function (expandedCategoryTypeId) {
      var categoryId = expandedCategoryTypeId.substring(0, 24),
        categoryTypeId = expandedCategoryTypeId.substring(25),
        catName = $rootScope.categoriesMap[categoryId].name,
        catTypeName = $rootScope.categoryTypesMap[categoryTypeId].name;
      return catName + gt + catTypeName;
    };

    $scope.displayValueForCategorySubType = function (expandedCategorySubTypeId) {
      var categoryId = expandedCategorySubTypeId.substring(0, 24),
        categoryTypeId = expandedCategorySubTypeId.substring(25, 49),
        categorySubTypeId = expandedCategorySubTypeId.substring(50),
        catName = $rootScope.categoriesMap[categoryId].name,
        catTypeName = $rootScope.categoryTypesMap[categoryTypeId].name,
        catSubTypeName = $rootScope.categorySubTypesMap[categorySubTypeId].name;
      return catName + gt + catTypeName + gt + catSubTypeName;
    };

    $scope.displayValueForCategoryInfo = function (expandedId) {
      if (expandedId) {
        if (expandedId.length === 24) {
          return $scope.displayValueForCategory(expandedId);
        } else if (expandedId.length === 49) {
          return $scope.displayValueForCategoryType(expandedId);
        } else if (expandedId.length === 74) {
          return $scope.displayValueForCategorySubType(expandedId);
        }
      }
      return '';
    };


    $scope.codeAddress = function () {
      $log.debug("geocoding address....");
      var b = $scope.business,
        addressQuery = ((b.addr1 || '') + ' ' + (b.city || '') + ' ' + (b.state || '') + ' ' + (b.zip || '')).trim();
      geocoder.codeAddress(addressQuery, function (err, data) {
        if (err) {
          $log.debug("error geocoding. " + err);
        } else {
          $log.debug("geocode result is: " + angular.toJson(data));
          $scope.business.addr1 = data.streetNumber + ' ' + data.street;
          $scope.business.city = data.city || $scope.business.city;
          $scope.business.state = data.state || $scope.business.state;
          $scope.business.zip = data.zip || $scope.business.zip;
          $scope.business.lat = data.lat;
          $scope.business.long = data.long;
          $scope.lookupNeighborhoodOfBusinessByLatLong();
          $scope.$apply();
        }

        // next, lookup info in google places
        if ($scope.business.place_id) {
          googlePlaces.getDetailsForPlace($scope.business.place_id, function (err, details) {
            if (err) {
              $log.error("Error fetching details from google places.  " + err);
              return;
            }
            $log.debug("Place details successfully retrieved for place_id " + $scope.business.place_id + "\n" + angular.toJson(details));
            $log.debug("rating is " + details.rating);
            $scope.business.imported_data = $scope.business.imported_data || {};
            $scope.business.imported_data.google_places = details;
            $scope.business.rating = details.rating;
            $scope.business.rating_google = details.rating;
            if (details.geometry && details.geometry.location) {
              $scope.business.lat = details.geometry.location.k;
              $scope.business.long = details.geometry.location.B || details.geometry.location.D;
            }
            $scope.$apply();
          });
        }

      });
    };


    $scope.lookupNeighborhoodOfBusinessByLatLong = function () {
      geocoder.getNeighborhoodsForLonLat($scope.business.long, $scope.business.lat, function (err, data) {
        if (err) {
          $log.debug("Unable to determine neighborhood for this business. " + angular.toJson(err));
        } else {
          if (_.isEmpty(data)) {
            $log.debug("no neighborhoods were found at lon/lat " + $scope.business.long + ', ' + $scope.business.lat);
          } else {
            $log.debug("neighborhoods were found! \n" + angular.toJson(data));
            $scope.business.neighborhoods = [data[0].name];
            $scope.business.neighborhoodGeoIds = geocoder.xformToNeighborhoodGeoIds(data);
          }
        }
      });
    };

    $scope.newImage = {
      businessId: $scope.businessId,
      name: '',
      description: ''
    };

    $scope.isUploadInProgress = false;
    $scope.uploadAlerts = [];

    $scope.closeUploadAlert = function (index) {
      $scope.uploadAlerts.splice(index, 1);
    };

    // https://github.com/danialfarid/angular-file-upload
    $scope.onFileSelect = function ($files) {
      $scope.isUploadInProgress = true;
      //$files: an array of files selected, each file has name, size, and type.
      for (var i = 0; i < $files.length; i++) {
        var file = $files[i];
        $scope.uploadAlerts.push({type: 'info', msg: 'Beginning to upload file ' + file.name + ' at ' + (new Date())});
        $scope.upload = $upload.upload({
          url: '/api/v1/businesses/' + $scope.businessId + '/images', //'server/upload/url', //upload.php script, node.js route, or servlet url
          method: 'POST',
          // headers: {'header-key': 'header-value'},
          // withCredentials: true,
          data: {myObj: $scope.newImage},
          file: file // or list of files: $files for html5 only
          /* set the file formData name ('Content-Desposition'). Default is 'file' */
          //fileFormDataName: myFile, //or a list of names for multiple files (html5).
          /* customize how data is added to formData. See #40#issuecomment-28612000 for sample code */
          //formDataAppender: function(formData, key, val){}
        }).progress(function (evt) {
          $log.debug('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
        }).success(function (data, status, headers, config) {
          // file is uploaded successfully
          $scope.isUploadInProgress = false;
          $log.debug(data);
          var uploadedFilename = '';
          if (angular.isArray(data) && data.length > 0) {
            uploadedFilename = data[0].name;
          } else if (data.hasOwnProperty('name')) {
            uploadedFilename = data.name;
          }
          $scope.uploadAlerts.push({type: 'success', msg: 'File ' + uploadedFilename + ' uploaded successfully at ' + (new Date())});
          $scope.refreshPhotos();
        }).error(function (err) {
          $scope.isUploadInProgress = false;
          $scope.uploadAlerts.push({type: 'error', msg: 'Error uploading file at ' + new Date()});
          $log.error("error uploading: " + err);
        });
      }
    };


    // ---------------- photo slider stuff -------------------

    // initial image index
    $scope._Index = 0;

    // if a current image is the same as requested image
    $scope.isActive = function (index) {
      return $scope._Index === index;
    };

    // show prev image
    $scope.showPrev = function () {
      $scope._Index = ($scope._Index > 0) ? --$scope._Index : $scope.photos.length - 1;
    };

    // show next image
    $scope.showNext = function () {
      $scope._Index = ($scope._Index < $scope.photos.length - 1) ? ++$scope._Index : 0;
    };

    // show a certain image
    $scope.showPhoto = function (index) {
      $scope._Index = index;
    };

  })




  //
  // ============================= Add ========================================
  //
  .controller('BusinessAddController', function($scope, $rootScope, $http, $log, ngTableParams, $location, $routeParams, categoriesManager, classificationsManager, states, $upload, businessNavHelper, $modal, geocoder, infoOverlay, citiesAndNeighborhoodsManager) {
    $scope.headline = "Add New Business";
    $scope.saveButtonText = 'Save Business';
    $scope.isAdd = true;
    $scope.business = {published: false, categoryIds: [], categoryTypeIds: [], categorySubTypeIds: []};
    $scope.states = states;
    $scope.isNotPublished = false;
    $scope.isPublished = true;

    $scope.catSelectionsModel = {};
    $scope.catTypeSelectionsModel = {};
    $scope.catSubTypeSelectionsModel = {};

    $scope.businessHelper = businessNavHelper;
    categoriesManager.reloadCategoryData();
    classificationsManager.reloadClassificationData();

    $scope.saveButtonClicked = function () {
      $http.post('/api/v1/businesses', $scope.business)
        .success(function (data) {
          infoOverlay.displayInfo("Changes saved successfully");
          $log.info("created new business successfully");
          $location.url('/businesses');
        })
        .error(function () {
          infoOverlay.displayInfo("error adding new business");
          $log.error("error adding new business");
        });
    };

    $scope.isClassificationInputEnabled = function (classificationId) {
      var associatedClassificationIds = [];
      if (_.isEmpty($scope.business.categoryIds)) {
        return false;
      }
      _.each($scope.business.categoryIds, function (categoryId) {
        var acIds = ($rootScope.categoriesMap[categoryId] || {}).associatedClassificationIds || [];
        associatedClassificationIds = associatedClassificationIds.concat(acIds);
      });
      associatedClassificationIds = _.uniq(associatedClassificationIds);
      return _.contains(associatedClassificationIds, classificationId);
    };

    $scope.cityStateNeighborhoodGeo = null;

    $scope.fetchNeighborhoodGeoForCityState = function (city, state, callback) {
      $log.debug("fetchNeighborhoodGeoForCityState: " + city + ", " + state);
      $http.get('/api/v1/city?city=' + city + '&state=' + state)
        .success(function (data) {
          $scope.cityStateNeighborhoodGeo = angular.isArray(data) && data.length > 0 ? data[0] : (_.isEmpty(data) ? null : data);
          if (angular.isFunction(callback)) {
            callback(null, $scope.cityStateNeighborhoodGeo);
          }
        })
        .error(function (err) {
          $scope.cityStateNeighborhoodGeo = null;
          alert("error fetching city/state neighborhoodGeo information.");
          callback(err, null);
        });
    };

    $scope.getNeighborhoodNamesArray = function () {
      if ($scope.business && $scope.business.neighborhoodGeoIds) {
        return citiesAndNeighborhoodsManager.getNamesByIds($scope.business.neighborhoodGeoIds);
      }
      return [];
    };

    $scope.photos = [];
    $scope.neighborhoodOptions = [];
    $scope.getNeighborhoodOptions = function (state, city, callback) {
      if (city && state) {
        $scope.fetchNeighborhoodGeoForCityState(city, state, function (err, data) {
          //$log.debug("data from fetchNeighborhoodGeoForCityState is " + angular.toJson(data));
          //$log.debug(" ... and $scope.cityStateNeighborhoodGeo is " + angular.toJson($scope.cityStateNeighborhoodGeo));
          if (err) {
            if (angular.isFunction(callback)) {
              callback(err, null);
            }
          } else if (!data || _.isEmpty($scope.cityStateNeighborhoodGeo)) {
            $log.debug("No city/state data..");
            $scope.neighborhoodOptions = [];
            callback(null, $scope.neighborhoodOptions);
          } else {
            $log.debug("$scope.cityStateNeighborhoodGeo is " + angular.toJson($scope.cityStateNeighborhoodGeo));
            citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData($scope.cityStateNeighborhoodGeo.id, true, true, function (err, data) {
              $scope.neighborhoodOptions = citiesAndNeighborhoodsManager.getChildrenByParentId($scope.cityStateNeighborhoodGeo.id);
              if (angular.isFunction(callback)) {
                callback(null, data);
              }
            });
          }
        });
      } else {
        $scope.neighborhoodOptions = null;
      }
    };

    $scope.lookupNeighborhoodOfBusinessByLatLong = function () {
      geocoder.getNeighborhoodsForLonLat($scope.business.long, $scope.business.lat, function (err, data) {
        if (err) {
          $log.debug("Unable to determine neighborhood for this business. " + angular.toJson(err));
        } else {
          if (_.isEmpty(data)) {
            $log.debug("no neighborhoods were found at lon/lat " + $scope.business.long + ', ' + $scope.business.lat);
          } else {
            $log.debug("neighborhoods were found! \n" + angular.toJson(data));
            $scope.business.neighborhoods = [data[0].name];
            $scope.business.neighborhoodGeoIds = geocoder.xformToNeighborhoodGeoIds(data);
          }
        }
      });
    };

    $scope.codeAddress = function () {
      $log.debug("geocoding address....");
      var b = $scope.business,
        addressQuery = ((b.addr1 || '') + ' ' + (b.city || '') + ' ' + (b.state || '') + ' ' + (b.zip || '')).trim();
      geocoder.codeAddress(addressQuery, function (err, data) {
        if (err) {
          $log.debug("error geocoding. " + err);
        } else {
          $log.debug("geocode result is: " + angular.toJson(data));
          $scope.business.addr1 = data.streetNumber + ' ' + data.street;
          $scope.business.city = data.city;
          $scope.business.state = data.state;
          $scope.business.zip = data.zip;
          $scope.business.lat = data.lat;
          $scope.business.long = data.long;
          $scope.lookupNeighborhoodOfBusinessByLatLong();
          $scope.$apply();
        }
      });
    };

//    $scope.addNewNeighborhoodIfNeeded = function () {
//      if ($scope.business.neighborhoods && $scope.business.neighborhoods.length > 0 && $scope.business.city && $scope.business.state) {
//        angular.forEach($scope.business.neighborhoods, function (val) {
//          if (val !== '(PENDING)') {
//            $http.post('/api/v1/neighborhoods', {city: $scope.business.city, state: $scope.business.state, neighborhood: val});
//          }
//        });
//      }
//    };

    $scope.editNeighborhoodsForBusiness = function (size) {
      $scope.getNeighborhoodOptions($scope.business.state, $scope.business.city, function (err, data) {
        if (err) {
          $log.error("error getting neighborhood options prior to modal popup");
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-neighborhoodsGeo-modal.html',
            controller: 'BusinessesNeighborhoodGeoModalController',
            size: size,
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableNeighborhoods: function () {
                return angular.isArray($scope.neighborhoodOptions) ? $scope.neighborhoodOptions.sort() : $scope.neighborhoodOptions;
              }
            }
          });
          modalInstance.result.then(function (data) {
            $scope.business.neighborhoods = data.neighborhoods || [];
            $scope.business.neighborhoodGeoIds = data.neighborhoodGeoIds || [];
            $scope.business.neighborhoodDisplayValue = $scope.business.neighborhoods.sort().join(', ');
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };


    $scope.onClickEditMultipleClassificationProperty = function (classificationId, businessPropertyName, numOfColumns, size) {
      classificationsManager.reloadClassificationData(function (err, data) {
        if (err) {
          $log.error("error loading classification data. " + err);
        } else {
          var modalInstance = $modal.open({
            templateUrl: 'business-generic-classification-modal.html',
            controller: 'BusinessesGenericClassificationModalController',
            size: size,
            resolve: {
              business: function () {
                return $scope.business;
              },
              availableValues: function () {
                return $rootScope.classificationTypes[classificationId];
              },
              businessPropertyName: function () {
                return businessPropertyName;
              },
              numOfColumns: function () {
                return numOfColumns;
              },
              classificationDisplayName: function () {
                return $rootScope.classificationsMap[classificationId].name;
              }
            }
          });

          modalInstance.result.then(function (data) {
            $scope.business[businessPropertyName] = data;
            $scope.businessForm.$setDirty(true);
          }, function () {
            $log.debug('Modal dismissed at: ' + new Date());
          });
        }
      });
    };

    $scope.combinedCategoryInfo = function () {
      var validCatIds = _.select($scope.business.categoryIds, function (val) {
          return angular.isDefined($rootScope.categoriesMap[val]);
        }),
        validCatTypeIds = _.select($scope.business.categoryTypeIds, function (val) {
          return angular.isDefined($rootScope.categoryTypesMap[val.substring(25)]);
        }),
        validCatSubTypeIds = _.select($scope.business.categorySubTypeIds, function (val) {
          return angular.isDefined($rootScope.categorySubTypesMap[val.substring(50)]);
        }),
        all = _.union(validCatIds, validCatTypeIds, validCatSubTypeIds).sort(),
        allFiltered = [],
        i,
        j,
        val1,
        val2,
        isSubstring;
      for (i = 0; i < all.length; i++) {
        isSubstring = false;
        val1 = all[i];
        for (j = 0; j < all.length; j++) {
          val2 = all[j];
          if (i !== j && val2.indexOf(val1) === 0) {
            isSubstring = true;
            break;
          }
        }
        if (!isSubstring) {
          allFiltered.push(val1);
        }
      }
      return allFiltered;
    };


    var gt = ' <span class="glyphicon glyphicon-chevron-right"></span> ';

    $scope.displayValueForCategory = function (categoryId) {
      return $rootScope.categoriesMap[categoryId].name;
    };

    $scope.displayValueForCategoryType = function (expandedCategoryTypeId) {
      var categoryId = expandedCategoryTypeId.substring(0, 24),
        categoryTypeId = expandedCategoryTypeId.substring(25),
        catName = $rootScope.categoriesMap[categoryId].name,
        catTypeName = $rootScope.categoryTypesMap[categoryTypeId].name;
      return catName + gt + catTypeName;
    };

    $scope.displayValueForCategorySubType = function (expandedCategorySubTypeId) {
      var categoryId = expandedCategorySubTypeId.substring(0, 24),
        categoryTypeId = expandedCategorySubTypeId.substring(25, 49),
        categorySubTypeId = expandedCategorySubTypeId.substring(50),
        catName = $rootScope.categoriesMap[categoryId].name,
        catTypeName = $rootScope.categoryTypesMap[categoryTypeId].name,
        catSubTypeName = $rootScope.categorySubTypesMap[categorySubTypeId].name;
      return catName + gt + catTypeName + gt + catSubTypeName;
    };

    $scope.displayValueForCategoryInfo = function (expandedId) {
      if (expandedId) {
        if (expandedId.length === 24) {
          return $scope.displayValueForCategory(expandedId);
        } else if (expandedId.length === 49) {
          return $scope.displayValueForCategoryType(expandedId);
        } else if (expandedId.length === 74) {
          return $scope.displayValueForCategorySubType(expandedId);
        }
      }
      return '';
    };


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

      $scope.business.categorySubTypeIds = [];
      _.each($scope.catSubTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categorySubTypeIds.push(key);
        }
      });

      $scope.business.categoryTypeIds = [];
      _.each($scope.catTypeSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categoryTypeIds.push(key);
        }
      });

      $scope.business.categoryIds = [];
      _.each($scope.catSelectionsModel, function (val, key) {
        if (val) {
          $scope.business.categoryIds.push(key);
        }
      });
    };


  })


  //
  // ============================= List All ===================================
  //
  .controller('BusinessesController', function($scope, $rootScope, $http, $log, $filter, ngTableParams, $location, $routeParams, appUtils, businessNavHelper, geocoder) {

    $scope.headline = "Businesses";
    $scope.businesses = [];
    $scope.businessesCount = null;
    $scope.filterCategoryId = $routeParams.categoryId;
    $scope.nameSearch = $routeParams.name;
    $scope.isViewForMissingFields = $location.path() == '/businesses-missing-fields';

    function translatePublishedRouteParam() {
      if ('true' === $routeParams.published) {
        return 'true';
      } else if ('false' === $routeParams.published) {
        return 'false';
      } else {
        return 'all';
      }
    }
    $scope.publishedFilterValue = translatePublishedRouteParam();
    $scope.publishedOptions = [
      {id: 'all', desc: "All (Published and Pending)"},
      {id: 'true', desc: "Published only"},
      {id: 'false', desc: "Pending Review only"}
    ];

    $scope.businessContentTableParams = new ngTableParams({
      page: $routeParams.pageNumber || 1,
      count: $routeParams.pageSize || 100,
      sorting: {
        name: 'asc'
      }
    }, {
      total: $scope.businesses.length,
      getData: function ($defer, params) {
        businessNavHelper.urlWithQueryParams = $location.absUrl();
        var queryParameters = {};
        if ($scope.filterCategoryId !== null && !_.isUndefined($scope.filterCategoryId)) {
          queryParameters.categoryId = $scope.filterCategoryId;
        }
        if ($scope.publishedFilterValue === 'true') {
          queryParameters.published = true;
        } else if ($scope.publishedFilterValue === 'false') {
          queryParameters.published = false;
        } else {
          queryParameters.published = 'all';
        }
        if ($scope.nameSearch) {
          queryParameters.name = $scope.nameSearch;
        }
        if (params.sorting()) {
          queryParameters.orderBy = params.orderBy()[0].slice(1);
          queryParameters.orderDir = params.orderBy()[0].slice(0, 1) === '+' ? 'asc' : 'desc';
        }
        businessNavHelper.searchParams = queryParameters;
        queryParameters.isPortal = true;
        if ($scope.isViewForMissingFields) {
          queryParameters.includeImageStats = true;
          queryParameters.includeSubCatCount = true;
        }
        var queryString = appUtils.queryStringFromObject(queryParameters);
        $http.get('/api/v1/businesses' + queryString)
          .success(function (data) {
            businessNavHelper.completeResults = data;
            params.total(data.length);
            $scope.businessesCount = data.length;
            $scope.businesses = data.slice((params.page() - 1) * params.count(), params.page() * params.count());
            $defer.resolve($scope.businesses);
          }).error(function (error) {
            $log.info("Error getting businesses. " + error);
            params.total(0);
            $scope.businessesCount = null;
            $scope.businesses = [];
            businessNavHelper.completeResults = [];
          });
      }
    });

    $scope.editBusiness = function (businessId, rowIndex) {
      $log.debug("editBusiness.");
      var index = $scope.businessContentTableParams.count() * ($scope.businessContentTableParams.page() - 1) + rowIndex;
      businessNavHelper.editBusinessAtIndex(index);
    };

    $scope.formatCoords = function (business) {
      if (business && business.lat && business.long) {
        return '[' + business.long + ', ' + business.lat + ']';
      }
      return '---';
    };

    $scope.getHrefForGoogleMapWithLonLat = function (neighborhood) {
      return geocoder.getHrefForGoogleMapWithLonLat(neighborhood);
    };

    $scope.applyFilter = function () {
      var queryParams = {},
        locationURL = $scope.isViewForMissingFields ? '/businesses-missing-fields' : '/businesses',
        queryString;

      if ($scope.publishedFilterValue === 'true') {
        queryParams.published = true;
      } else if ($scope.publishedFilterValue === 'false') {
        queryParams.published = false;
      } else {
        queryParams.published = 'all';
      }
      if ($scope.nameSearch) {
        queryParams.name = $scope.nameSearch;
      }
      if ($scope.businessContentTableParams.sorting()) {
        queryParams.orderBy = $scope.businessContentTableParams.orderBy()[0].slice(1);
        queryParams.orderDir = $scope.businessContentTableParams.orderBy()[0].slice(0, 1) === '+' ? 'asc' : 'desc';
      }

      if ($scope.filterCategoryId !== null && !_.isUndefined($scope.filterCategoryId)) {
        $log.debug("filtering businesses on categoryId " + $scope.filterCategoryId);
        queryParams.categoryId = $scope.filterCategoryId;
      }
      queryString = appUtils.queryStringFromObject(queryParams);
      $location.url(locationURL + queryString);
    };

    $scope.formatNeighborhoodsList = function (neighborhoods) {
      if (neighborhoods && angular.isArray(neighborhoods)) {
        return neighborhoods.sort().join(', ');
      }
      return '';
    };

  });

