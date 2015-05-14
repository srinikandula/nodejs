'use strict';

/* App Module */

var beaconApp = angular.module('beaconApp', [
  'ngRoute',
  'ngAnimate',
  'ngTouch',
  'mgcrea.ngStrap',
  'ngTable',
  'ui.bootstrap',
  'unsavedChanges',
  'angularSpinner',
  'beaconApp.homeModule',
  'beaconApp.conditionModule',
  'beaconApp.procedureModule',
  'beaconApp.neighborhoodsModule',
  'beaconApp.beaconModule',
  'beaconApp.businessModule',
  'beaconApp.classificationModule',
  'beaconApp.apiDocsModule',
  'beaconApp.accountModule',
  'beaconApp.userModule'
]);


beaconApp.config(['$routeProvider',
  function ($routeProvider) {
    console.log("configuring routes");
    $routeProvider.
      when('/', {
        templateUrl: 'partials/home.tpl.html',
        controller: 'HomeController'
      }).
      when('/beacons', {
        templateUrl: 'partials/beacons.tpl.html',
        controller: 'BeaconsController'
      }).
      when('/beacons/:id', {
        templateUrl: 'partials/beacon-details.tpl.html',
        controller: 'BeaconController'
      }).
      when('/beacons-new', {
        templateUrl: 'partials/beacon-details.tpl.html',
        controller: 'BeaconAddController'
      }).
      when('/businesses', {
        templateUrl: 'partials/businesses.tpl.html',
        controller: 'BusinessesController'
      }).
      when('/businesses-missing-fields', {
        templateUrl: 'partials/businesses.tpl.html',
        controller: 'BusinessesController'
      }).
      when('/businesses/:id', {
        templateUrl: 'partials/business-details.tpl.html',
        controller: 'BusinessController'
      }).
      when('/businesses-new', {
        templateUrl: 'partials/business-details.tpl.html',
        controller: 'BusinessAddController'
      }).
      when('/businesses-import-google', {
        templateUrl: 'partials/businesses-import-google.tpl.html',
        controller: 'BusinessImportController'
      }).
      when('/categories', {
        templateUrl: 'partials/categories.tpl.html',
        controller: 'CategoriesController'
      }).
      when('/categories/:id', {
        templateUrl: 'partials/categoryTypes.tpl.html',
        controller: 'CategoryTypesController'
      }).
      when('/categoriessub/:categoryId/:categoryTypeId', {
        templateUrl: 'partials/categorySubTypes.tpl.html',
        controller: 'CategorySubTypesController'
      }).


      // BEGIN: rokketmed additions ===========================================
      when('/conditions', {
        templateUrl: 'partials/conditions.tpl.html',
        controller: 'ConditionsController'
      }).
      when('/conditions/:id', {
        templateUrl: 'partials/condition-details.tpl.html',
        controller: 'ConditionController'
      }).
      when('/conditions-new', {
        templateUrl: 'partials/condition-details.tpl.html',
        controller: 'ConditionAddController'
      }).

      when('/procedures', {
        templateUrl: 'partials/procedures.tpl.html',
        controller: 'ProceduresController'
      }).
      when('/procedures/:id', {
        templateUrl: 'partials/procedure-details.tpl.html',
        controller: 'ProcedureController'
      }).
      when('/procedures-new', {
        templateUrl: 'partials/procedure-details.tpl.html',
        controller: 'ProcedureAddController'
      }).
      // END: rokketmed additions =============================================

      when('/users', {
        templateUrl: 'partials/users.tpl.html',
        controller: 'UsersController'
      }).
      when('/user', {
        templateUrl: 'partials/user-details.tpl.html',
        controller: 'UserEditController'
      }).
      when('/users-new', {
        templateUrl: 'partials/user-details.tpl.html',
        controller: 'UserAddController'
      }).
      when('/docs', {
        templateUrl: 'partials/api-docs.tpl.html',
        controller: 'APIDocsController'
      }).
      when('/account', {
        templateUrl: 'partials/account.tpl.html',
        controller: 'AccountController'
      }).
      when('/cities', {
//        templateUrl: 'partials/neighborhoods-legacy.tpl.html',
        templateUrl: 'partials/cities-list.tpl.html',
        controller: 'NeighborhoodsController'
      }).
      when('/cities/:id', {
        templateUrl: 'partials/neighborhoods-list.tpl.html',
        controller: 'NeighborhoodsListController'
      }).
      // ToDo: account, logout
      otherwise({
        redirectTo: '/'
      });
  }]);

beaconApp.run(function ($rootScope, $location, appConfigManager, categoriesManager, classificationsManager, citiesAndNeighborhoodsManager, userManager) {
  appConfigManager.fetchAppSettings(function (err, cfg) {
    $rootScope.appConfigManager = appConfigManager;
  }, true);
  userManager.getCurrentUser(function (err) {
    if (!err) {
      userManager.getGroupsForCurrentUser();
    }
  });
  $rootScope.userManager = userManager;
  $rootScope.poiSearchText = '';
  $rootScope.searchPOIs = function () {
    $location.url('/businesses?name=' + $rootScope.poiSearchText);
  };
  categoriesManager.reloadCategoryData();
  classificationsManager.reloadClassificationData();
  citiesAndNeighborhoodsManager.fetchAllCityAndNeighborhoodData();
});