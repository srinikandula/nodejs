'use strict';
/*global angular, _*/

angular.module('beaconApp.classificationModule', [])

  // ==================================================================================================================
  //         Categories (List view)
  // ==================================================================================================================
  .controller('CategoriesController', function ($scope, $http, $log, $location, categoriesManager, classificationsManager, $modal) {
    $log.debug('CategoriesController loading');

    $scope.headline = "Categories";

    categoriesManager.reloadCategoryData();
    classificationsManager.reloadClassificationData();

    $scope.editCategory = function (categoryId) {
      $log.debug('editCategory(' + categoryId + ')');
      $location.url('/categories/' + categoryId);
    };

    $scope.editClassification = $scope.editCategory;

    var reloadAppropriateData = function (categoryOrClassification) {
      if (categoryOrClassification) {
        var visibleFlag = angular.isDefined(categoryOrClassification.visible) ? categoryOrClassification.visible : true;
        return visibleFlag ? categoriesManager.reloadCategoryData() : classificationsManager.reloadClassificationData();
      }
      categoriesManager.reloadCategoryData();
      classificationsManager.reloadClassificationData();
    };

    $scope.deleteCategoryClicked = function (category) {
      var visibleFlag = angular.isDefined(category.visible) ? category.visible : true
        , entityType = (visibleFlag ? "category" : "classification")
        , categoryId = category.id;
      $http.delete('/api/v1/classifications/' + categoryId)
        .success(function () {
          $log.info("successfully deleted " + entityType + " '" + categoryId + "'");
          reloadAppropriateData(category);
        })
        .error(function () {
          $log.error("error deleting the category: " + categoryId);
          reloadAppropriateData(category);
        });
    };

    $scope.addCategoryClicked = function () {
      var categoryName = prompt("Category name:");
      if (categoryName && categoryName !== '') {
        $http.post('/api/v1/classifications', {name: categoryName})
          .success(function (data) {
            $log.info("created new classification successfully");
            categoriesManager.reloadCategoryData();
          })
          .error(function () {
            $log.error("error adding new classification");
          });
      }
    };

    $scope.handleEditCategoryNameClicked = function (category) {
      var visibleFlag = !!category.visible
        , entityType = (visibleFlag ? "category" : "classification")
        , newName = prompt("Enter new " + entityType + " name", category.name);
      if (newName && newName !== category.name) {
        $log.debug("changing " + entityType + " name from " + category.name + " to " + newName);
        $http.put('/api/v1/classifications/' + category.id, {name: newName, visible: visibleFlag})
          .success(function () {reloadAppropriateData(category);})
          .error(function () {reloadAppropriateData(category);});
      }
    };

    $scope.dataTypeDisplayName = classificationsManager.dataTypeDisplayName;
    $scope.isListOrHierarchy = classificationsManager.isListOrHierarchy;

    $scope.addClassificationClicked = function (size) {
      var modalInstance = $modal.open({
        templateUrl: 'classification-add-modal.html',
        controller: 'ClassificationAddModalController',
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
        classificationsManager.reloadClassificationData();
      }, function () {
        $log.debug('Modal dismissed at: ' + new Date());
      });
    };

  })

  // ==================================================================================================================
  //         Category Types View
  // ==================================================================================================================
  .controller('CategoryTypesController', function ($scope, $rootScope, $http, $log, $location, $routeParams, categoriesManager, classificationsManager, infoOverlay) {
    $log.debug('CategoryTypesController loading');

    $scope.updateTypesMap = function () {
      $scope.categoryId = $routeParams.id;
      $scope.isCategory = !!$rootScope.categoriesMap[$scope.categoryId];
      $scope.currentCategory = $rootScope.categoriesMap[$scope.categoryId] || ($rootScope.classificationsMap ? $rootScope.classificationsMap[$scope.categoryId] : {});
      $scope.headline = $scope.isCategory ? 'Category Types' : $scope.currentCategory.name + ' Values';

      $scope.typesMap = $scope.isCategory ? $rootScope.categoryTypes : $rootScope.classificationTypes;

      if ($scope.currentCategory) {
        angular.forEach($scope.currentCategory.associatedClassificationIds, function (val) {
          $scope.classificationSelectionsModel[val] = true;
        });
      }
    };

    categoriesManager.reloadCategoryData($scope.updateTypesMap);
    classificationsManager.reloadClassificationData($scope.updateTypesMap);

    $scope.categoryId = $routeParams.id;
    $scope.classificationSelectionsModel = {};

    var refreshTypesMap = function () {
      if ($scope.isCategory) {
        categoriesManager.reloadCategoryData($scope.updateTypesMap);
      } else {
        classificationsManager.reloadClassificationData($scope.updateTypesMap);
      }
    };

    $scope.handleClassificationCheckboxChanged = function (classificationId) {
      var newAssociatedClassificationIds = [];
      _.each($scope.classificationSelectionsModel, function (val, key) {
        if (val) {
          newAssociatedClassificationIds.push(key);
        }
      });
      $scope.currentCategory.associatedClassificationIds = newAssociatedClassificationIds;
    };

    $scope.handleSaveClassificationAssociationsClicked = function () {
      $log.debug("handleSaveClassificationAssociationsClicked");
      $http.put('/api/v1/categories/' + $scope.categoryId, {associatedClassificationIds: $scope.currentCategory.associatedClassificationIds})
        .success(function (data) {
          infoOverlay.displayInfo("Changes saved successfully");
          $scope.associatedClassificationForm.$setPristine();
        })
        .error(function (error) {
          var errorMsg = "Error saving changes to associated classifications.  " + (error.error || '');
          infoOverlay.displayErrorInfo(errorMsg);
          $log.error(errorMsg);
        });
    };

    $scope.deleteCategoryTypeClicked = function (categoryTypeId) {
      if (!categoryTypeId || categoryTypeId === '') {
        $log.error("No categoryTypeId was specified.");
        return;
      }
      $http.delete('/api/v1/classifications/' + $scope.categoryId + '/' + categoryTypeId)
        .success(function (data) {
          $log.info("successfully deleted the category type type with id of '" + categoryTypeId + "'");
          refreshTypesMap();
        })
        .error(function () {
          $log.error("error deleting the category type with id of '" + categoryTypeId + "'");
          refreshTypesMap();
        });
    };

    $scope.editCategoryType = function (categoryTypeId) {
      if ($scope.isCategory || (angular.isDefined($scope.currentCategory.maxDepth) && $scope.currentCategory.maxDepth > 1)) {
        $log.debug('editCategoryType(' + $scope.categoryId + ', ' + categoryTypeId + ')');
        $location.url('/categoriessub/' + $scope.categoryId + '/' + categoryTypeId);
      }
    };

    $scope.addCategoryTypeClicked = function () {
      var typeName = prompt("Name of category type:");
      if (typeName && typeName !== '') {
        $http.post('/api/v1/classifications/' + $scope.categoryId, {name: typeName})
          .success(function (data) {
            $log.info("successfully added new category type : " + typeName + "\n" + JSON.stringify(data));
            refreshTypesMap();
          })
          .error(function () {
            $log.error("error adding a new category type with name " + typeName);
            refreshTypesMap();
          });
      }
    };

    $scope.handleEditCategoryTypeNameClicked = function (categoryType) {
      var newName = prompt("Enter new category type name", categoryType.name);
      if (newName && newName !== categoryType.name) {
        $log.debug("changing category type name from " + categoryType.name + " to " + newName);
        $http.put('/api/v1/classifications/' + $scope.categoryId + "/" + categoryType.id, {name: newName})
          .success(refreshTypesMap)
          .error(refreshTypesMap);
      }
    };


  })

  // ==================================================================================================================
  //         Category Sub-Types View
  // ==================================================================================================================
  .controller('CategorySubTypesController', function ($scope, $rootScope, $http, $log, $routeParams, categoriesManager) {
    $log.debug('CategorySubTypesController loading');

    $scope.headline = "Category Sub-Types";

    if (!$rootScope.categories) {
      categoriesManager.reloadCategoryData();
    }

    $scope.categoryId = $routeParams.categoryId;
    $scope.currentCategory = $rootScope.categoriesMap[$scope.categoryId];

    $scope.categoryTypeId = $routeParams.categoryTypeId;
    $scope.currentCategoryType = $rootScope.categoryTypesMap[$scope.categoryTypeId];

    $scope.currentCategorySubTypes = $rootScope.categorySubTypes[$scope.categoryTypeId];

    $scope.deleteCategorySubTypeClicked = function (categorySubTypeId) {
      if (!categorySubTypeId || categorySubTypeId === '') {
        $log.error("No categorySubTypeId was specified.");
        return;
      }
      $http.delete('/api/v1/classifications/' + $scope.categoryId + '/' + $scope.categoryTypeId + '/' + categorySubTypeId)
        .success(function (data) {
          $log.info("successfully deleted the category sub-type type with id of '" + categorySubTypeId + "'");
          categoriesManager.reloadCategoryData();
        })
        .error(function () {
          $log.error("error deleting the category sub-type with id of '" + categorySubTypeId + "'");
        });
    };

    $scope.addCategorySubTypeClicked = function () {
      var typeName = prompt("Name of category sub-type:");
      if (typeName && typeName !== '') {
        $http.post('/api/v1/classifications/' + $scope.categoryId + '/' + $scope.categoryTypeId, {name: typeName})
          .success(function (data) {
            $log.info("successfully added new category sub-type : " + typeName + "\n" + JSON.stringify(data));
            categoriesManager.reloadCategoryData();
          })
          .error(function () {
            $log.error("error adding a new category sub-type with name " + typeName);
          });
      }
    };

    $scope.handleEditCategorySubTypeNameClicked = function (categorySubType) {
      var newName = prompt("Enter new category sub-type name", categorySubType.name);
      if (newName && newName !== categorySubType.name) {
        $log.debug("changing category type name from " + categorySubType.name + " to " + newName);
        $http.put('/api/v1/classifications/' + $scope.categoryId + "/" + $scope.categoryTypeId + "/" + categorySubType.id, {name: newName})
          .success(function (data) {
            categoriesManager.reloadCategoryData();
          })
          .error(function (error) {
            categoriesManager.reloadCategoryData();
          });
      }
    };

  })



  // ==================================================================================================================
  //         MODAL - Add Classification
  // ==================================================================================================================
  .controller('ClassificationAddModalController', function ($scope, $http, $log, $modalInstance, classificationsManager) {

    $scope.classification = { name: '', visible: false, dataType: null };
    $scope.dataTypes = classificationsManager.dataTypes;

    $scope.ok = function () {
      if ($scope.classification.name.trim() === '') {
        alert("'name' is required.");
        return;
      }
      if (!$scope.classification.dataType) {
        alert("You must choose a data type");
        return;
      }
      $http.post('/api/v1/classifications', $scope.classification)
        .success(function () {
          $modalInstance.close($scope.classification);
        })
        .error(function (err) {
          var errMsg = "Error adding classification. " + err.error;
          $log.error(errMsg);
          alert(errMsg);
        });
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
  });



