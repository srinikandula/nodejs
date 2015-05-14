'use strict';
/*global angular, $*/

var portalApp = angular.module('beaconApp');

portalApp.factory('infoOverlay', function () {
  var hideOverlay, displayOverlay;

  hideOverlay = function () {
    $('#infoOverlay').fadeOut();
  };

  displayOverlay = function (info, cssClassToAdd, cssClassToRemove) {
    hideOverlay();
    $('#infoOverlayDetails').html(info);
    $('#infoOverlay').removeClass(cssClassToRemove).addClass(cssClassToAdd).fadeIn();
    setTimeout(hideOverlay, 1800);
  };

  return {

    hideInfo: function () {
      hideOverlay();
    },

    displayInfo: function (info) {
      displayOverlay(info, 'bg-info', 'bg-danger');
    },

    displayErrorInfo: function (info) {
      displayOverlay(info, 'bg-danger', 'bg-info');
    }
  };
});



