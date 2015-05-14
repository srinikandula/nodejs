"use strict";
/*global angular,_*/

var portalApp = angular.module('beaconApp');

portalApp.factory('classificationsManager', function ($rootScope, $http, $log) {

  return {
    isListOrHierarchy: function (classification) {
      return classification && (_.isUndefined(classification.dataType) || classification.dataType === 'list');
    },
    dataTypes: [
      {id: 'boolean', name: 'Boolean'},
      {id: 'float', name: 'Float'},
      {id: 'integer', name: 'Integer'},
      {id: 'list', name: 'List of Values'},
      {id: 'string', name: 'String'}
    ],
    dataTypeDisplayName: function (classification) {
      var displayName = '';
      if (classification) {
        if (classification.dataType) {
          switch (classification.dataType) {
            case 'boolean': return 'Boolean';
            case 'string': return 'String';
            case 'integer': return 'Integer';
            case 'float': return 'Float';
            case 'list': return (classification.maxDepth && classification.maxDepth > 1 ? 'Hierarchy' : 'List') + ' of Values';
            default: return 'Unknown';
          }
        }
        if (classification.visible) {
          displayName = 'Hierarchy of Values';
        } else {
          displayName = (classification.maxDepth && classification.maxDepth > 1 ? 'Hierarchy' : 'List') + ' of Values';
        }
      }
      return displayName;
    },
    reloadClassificationData: function (callback) {
      $log.info("Fetching all classifications.");
      $http.get('/api/v1/classifications?visible=false').success(function (data) {
        $rootScope.classifications = _.sortBy(data, 'name');
        $rootScope.classificationsMap = {};
        $rootScope.classificationTypes = {};
        $rootScope.classificationTypesMap = {};
        $rootScope.classificationSubTypes = {};
        $rootScope.classificationSubTypesMap = {};
        if ($rootScope.classifications) {
          for (var i = 0; i < $rootScope.classifications.length; i++) {
            var classification = data[i];
            $rootScope.classificationsMap[classification.id] = classification;
            var tmpClassificationTypes = (classification && classification.types) ? classification.types : [];
            $rootScope.classificationTypes[classification.id] = tmpClassificationTypes;
            for (var j = 0; j < tmpClassificationTypes.length; j++) {
              var tmpClassificationType = tmpClassificationTypes[j];
              $rootScope.classificationTypesMap[tmpClassificationType.id] = tmpClassificationType;
              var tmpClassificationSubTypes = (tmpClassificationType && tmpClassificationType.subtypes) ? tmpClassificationType.subtypes : [];
              $rootScope.classificationSubTypes[tmpClassificationType.id] = tmpClassificationSubTypes;
              for (var k = 0; k < tmpClassificationSubTypes.length; k++) {
                var tmpClassificationSubType = tmpClassificationSubTypes[k];
                $rootScope.categorySubTypesMap[tmpClassificationSubType.id] = tmpClassificationSubType;
              }
            }
          }
        }

        //$log.debug("rootscope classifications: \n" + JSON.stringify($rootScope.classifications, null, 3) + '\n\n');
        //$log.debug("rootscope classificationTypes: \n" + JSON.stringify($rootScope.classificationTypes, null, 3) + '\n\n');
        //$log.debug("rootscope classificationSubTypes: \n" + JSON.stringify($rootScope.classificationSubTypes, null, 3) + '\n\n');

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