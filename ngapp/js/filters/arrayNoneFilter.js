var app = angular.module('beaconApp');

/**
 * The 'arrayNone' filter will format the array as a comma-separated list of values, or else 'None' if it is empty.
 * You can override the 'None' string with your own custom string with the 'textForNone' param.
 * You can override the separator with the 'separatorString' param
 * If the parameter is not an array, it is returned as-is.
 */
app.filter('arrayNone', function () {
  return function (val, textForNone, separatorString) {
    if (angular.isUndefined(val) || val === null) {
      return textForNone || 'None';
    }
    if (!angular.isArray(val)) {
      return val;
    }
    if (val.length === 0) {
      return textForNone || 'None';
    }
    return val.join(separatorString || ", ");
  };
});