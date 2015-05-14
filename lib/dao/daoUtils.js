"use strict";

var mongoskin = require('mongoskin');


exports.getIdQuery = function (idStr) {
  return {_id: new mongoskin.helper.toObjectID(idStr)};
};