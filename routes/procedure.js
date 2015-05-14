"use strict";

var _ = require('underscore')
  , RequestUtils = require('../lib/requestUtils')
  , JSONResponseUtils = require('../lib/jsonResponseUtils')
  , mongoskin = require('mongoskin');

var COLL_PROCEDURES = 'procedures';
var procedures = function (db) {
  return db.collection(COLL_PROCEDURES);
};


var transformToProcedureDTO = function (obj) {
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
var procedureFromRequest = function (req) {
  if (req) {
    var procedure = {};
    if (req.params.id) {
      procedure._id = req.params.id;
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'description',
      'cptCode'
    ], req, procedure);
    return procedure;
  }
  return null;
};

var isValidProcedure = function (obj, isIDRequired) {
  if (obj) {
    if (isIDRequired && !obj.hasOwnProperty('_id')) {
      console.log("procedure is not valid because _id is required");
      return false;
    }
    return obj.hasOwnProperty('name');
  }
  return false;
};



exports.findAll = function (db) {
  return function (req, res) {
    procedures(db).find().sort({'name': 1}).toArray(function (err, items) {
      transformToProcedureDTO(items);
      res.json(items);
    });
  };
};

exports.getProcedure = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("get procedure with id of " + id);
    procedures(db).findById(id, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding procedure with id of " + id);
      } else {
        transformToProcedureDTO(item);
        res.json(item);
      }
    });
  };
};

exports.addProcedure = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, "addProcedure()");
    var procedure = procedureFromRequest(req);
    console.log("add procedure: " + JSON.stringify(procedure));
    if (!isValidProcedure(procedure)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for procedure");
      return;
    }
    procedure.createdAt = new Date();
    procedures(db).insert(procedure, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error inserting new procedure. " + err);
      } else {
        transformToProcedureDTO(result);
        res.json(201, result);
      }
    });
  };
};

exports.editProcedure = function (db) {
  return function (req, res) {
    var id = req.params.id
      , procedure;
    console.log("edit procedure with id of " + id);
    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }
    procedure = procedureFromRequest(req);
    if (!isValidProcedure(procedure, true)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for procedure");
      return;
    }
    delete procedure._id;
    procedures(db).update({_id: new mongoskin.BSONPure.ObjectID(id)}, {$set: procedure}, {safe: true, multi: false}, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error editing procedure. " + err);
      } else {
        console.log("successfully saved changes to procedure " + id + ". result: " + result);
        res.json(200, null);
      }
    });
  };
};

exports.deleteProcedure = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("delete procedure with id of " + id);
    procedures(db).removeById(id, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting procedure. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};

