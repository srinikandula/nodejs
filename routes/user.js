"use strict";

var util = require('util')
  , RequestUtils = require('../lib/requestUtils');


exports.getCurrentUser = function () {
  return function (req, res) {
    if (RequestUtils.unauthenticatedErrorResponseIfNotLoggedIn(req, res)) {
      return;
    }
    //console.log("req.user is: " + util.inspect(req.user));
    req.user.getCustomData(function (err, customData) {
      if (err) {
        RequestUtils.errorResponse(res, 'error getting customData for account. ' + err);
      } else {
        console.log("got customData: " + util.inspect(customData));
        req.user.customData = customData;
        res.json(req.user);
      }
    });
  };
};

exports.getGroupsForCurrentUser = function () {
  return function (req, res) {
    if (RequestUtils.unauthenticatedErrorResponseIfNotLoggedIn(req, res)) {
      return;
    }
    req.user.getGroups(function (err, groups) {
      if (err) {
        RequestUtils.errorResponse(res, 'error getting groups. ' + err);
        return;
      }
      //console.log(util.format("groups for user '%s' are: %j", req.user.username, groups));
      res.json(groups);
    });
  };
};