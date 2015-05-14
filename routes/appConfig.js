"use strict";

var _ = require('underscore')
    , RequestUtils = require('../lib/requestUtils');


exports.getAppConfigProperties = function () {
  return function (req, res) {
    res.json({
      'conditions.enabled': !!process.env.CFG_CONDITIONS_ENABLED,
      'procedures.enabled': !!process.env.CFG_PROCEDURES_ENABLED
    });
  };
};

