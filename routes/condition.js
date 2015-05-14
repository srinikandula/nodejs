"use strict";

var _ = require('underscore')
  , RequestUtils = require('../lib/requestUtils')
  , JSONResponseUtils = require('../lib/jsonResponseUtils')
  , mongoskin = require('mongoskin');

var COLL_CONDITIONS = 'conditions';
var conditions = function (db) {
  return db.collection(COLL_CONDITIONS);
};


var transformToConditionDTO = function (obj) {
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var objToDTO = function (rawObj) {
    JSONResponseUtils.replaceIdField(rawObj);
  };
  if (_.isArray(obj)) {
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};


/**
 * factory method to create POJSO from request object
 */
var conditionFromRequest = function (req) {
  if (req) {
    var condition = {};
    if (req.params.id) {
      condition._id = req.params.id;
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'description',
      'icdCode'
    ], req, condition);
    return condition;
  }
  return null;
};

var isValidCondition = function (obj, isIDRequired) {
  if (obj) {
    if (isIDRequired && !obj.hasOwnProperty('_id')) {
      console.log("condition is not valid because _id is required");
      return false;
    }
    return obj.hasOwnProperty('name');
  }
  return false;
};



exports.findAll = function (db) {
  return function (req, res) {
    conditions(db).find().sort({'name': 1}).toArray(function (err, items) {
      transformToConditionDTO(items);
      res.json(items);
    });
  };
};

exports.getCondition = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("get condition with id of " + id);
    conditions(db).findById(id, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding condition with id of " + id);
      } else {
        transformToConditionDTO(item);
        res.json(item);
      }
    });
  };
};

exports.addCondition = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, "addCondition()");
    var condition = conditionFromRequest(req);
    console.log("add condition: " + JSON.stringify(condition));
    if (!isValidCondition(condition)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for condition");
      return;
    }
    condition.createdAt = new Date();
    conditions(db).insert(condition, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error inserting new condition. " + err);
      } else {
        transformToConditionDTO(result);
        res.json(201, result);
      }
    });
  };
};

exports.editCondition = function (db) {
  return function (req, res) {
    var id = req.params.id
      , condition;
    console.log("edit condition with id of " + id);
    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }
    condition = conditionFromRequest(req);
    if (!isValidCondition(condition, true)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for condition");
      return;
    }
    delete condition._id;
    conditions(db).update({_id: new mongoskin.BSONPure.ObjectID(id)}, {$set: condition}, {safe: true, multi: false}, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error editing condition. " + err);
      } else {
        console.log("successfully saved changes to condition " + id + ". result: " + result);
        res.json(200, null);
      }
    });
  };
};

exports.deleteCondition = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("delete condition with id of " + id);
    conditions(db).removeById(id, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting condition. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};

