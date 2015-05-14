'use strict';

/* App Module */

var rpgApp = angular.module('rpgApp', [
  'ngRoute',
  'rpgControllers'//,
  //'mgcrea.ngStrap'
]);

rpgApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/dashboard.tpl.html',
        controller: 'DashboardController'
      }).
      when('/items', {
        templateUrl: 'partials/items.tpl.html',
        controller: 'ItemsController'
      }).
      when('/items/:id', {
        templateUrl: 'partials/item_details.tpl.html',
        controller: 'ItemsController'
      }).
      when('/spells', {
        templateUrl: 'partials/spells.tpl.html',
        controller: 'SpellsController'
      }).
      when('/npcs', {
        templateUrl: 'partials/npcs.tpl.html',
        controller: 'NPCsController'
      }).
      when('/users', {
        templateUrl: 'partials/users.tpl.html',
        controller: 'UsersController'
      }).
      when('/zones', {
        templateUrl: 'partials/zones.tpl.html',
        controller: 'ZonesController'
      }).
      when('/npcs', {
        templateUrl: 'partials/npcs.tpl.html',
        controller: 'SpellsController'
      }).
      otherwise({
        redirectTo: '/'
      });
    // otherwise({
    //   redirectTo: '/phones'
    // });
  }]);