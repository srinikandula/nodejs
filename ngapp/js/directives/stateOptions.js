// https://coderwall.com/p/fyuxhg

angular.module('beaconApp')
  .directive('stateOptions', function (states) { //states value injected into directive context
    return {
      restrict: 'E',
      replace: true,
      scope: true,  //we want a separate child scope
      template: '<select ng-options="state.abbreviation as state.displayName for state in states" class="form-control"><option value="">--- Choose State ---</option></select>',
      require: '^ngModel',
      link: function(scope, element, attrs) {
        scope.states = states;
      }
    };
  });