"use strict";

var RequestUtils = require('../lib/requestUtils')
  , JSONResponseUtils = require('../lib/jsonResponseUtils')
  , mongoskin = require('mongoskin')
  , ObjectID = mongoskin.ObjectID
  , COLL_CLASSIFICATIONS = 'classifications'
  , _ = require('underscore')
  , util = require('util')
  , classificationsDAO = require('../lib/dao/classificationsDAO');

var classifications = function (db) {
  return db.collection(COLL_CLASSIFICATIONS);
};

var transformToClassificationDTO = function (obj) {
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


/*
 * Classification object is to contain a hierarchy as follows:
 *
 * {"name": "catName1",
 *  "description": "",
 *  "visible": true,
 *  "types": [
 *    { "id":"xxx", "name":"type1", "subtypes": [
 *      {"id":"aaa", "name":"subType1"},
 *      {"id":"bbb", "name":"subTypeN"}
 *     },
 *    { "id":"yyy", "name":"typeN", "subtypes": [
 *      {"id":"ccc", "name":"subType1" },
 *      {"id":"ddd", "name":"subTypeN"}
 *     },
 *  ]},
 *
 *
 *
 */

var isValidClassification = function (obj, isIDRequired) {
  if (obj) {
    if (isIDRequired && !obj.hasOwnProperty('_id')) {
      console.log("classification is not valid because _id is required");
      return false;
    }
    return obj.hasOwnProperty('name');
  }
  return false;
};

var isValidClassificationType = function (obj) {
  return obj && obj.hasOwnProperty('id') && obj.id && obj.id !== '' && obj.hasOwnProperty('name') && obj.name && obj.name !== '';
};

var isValidClassificationSubType = function (obj) {
  return obj && obj.hasOwnProperty('id') && obj.id && obj.id !== '' && obj.hasOwnProperty('name') && obj.name !== null && obj.name !== '';
};

/**
 * factory method to create POJSO from request object
 */
var newClassificationFromRequest = function (req) {
  if (req) {
    var classification = {};
    if (req.params.id) {
      classification._id = req.params.id;
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'dataType',
      'description'
    ], req, classification);
    RequestUtils.setFieldsAsBooleanIfExist(['visible'], req, classification);
    RequestUtils.setFieldsAsIntIfExist(['maxDepth'], req, classification);
    return classification;
  }
  return null;
};


/**
 * by default this will return only 'visible' classifications unless 'visible' = false param is passed
 */
exports.listAllClassifications = function (db) {
  return function (req, res) {
    var visibleParam = RequestUtils.getBooleanFieldIfExists('visible', req);
    classificationsDAO.findItems(db, visibleParam, function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error retrieving classifications. " + err);
      } else {
        transformToClassificationDTO(data);
        res.json(data);
      }
    });
  };
};

exports.getClassification = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("get classification with id of " + id);
    classifications(db).findById(id, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding classification with id of " + id);
      } else {
        transformToClassificationDTO(item);
        res.json(item);
      }
    });
  };
};

exports.findById = function (db, id, callback) {
  classifications(db).findById(id, callback);
};

/**
 * Updates an existing top-level category.  It will only allow you to change
 * the 'visible' field (required) and the 'name' field.
 */
exports.setClassificationVisibilityAndName = function (db) {
  return function (req, res) {
    var id = req.params.id,
      queryOptions = {safe: true, multi: false},
      visibleRaw = RequestUtils.getBooleanFieldIfExists('visible', req),
      visible = visibleRaw === null ? null : visibleRaw,
      name = RequestUtils.getFieldIfExists('name', req),
      updateOp = {$set: {'visible': visible}},
      idQuery = RequestUtils.getIdQuery(id, true),
      associatedClassificationIds = RequestUtils.getFieldIfExists('associatedClassificationIds', req),
      performUpdate;

    if (associatedClassificationIds && (visible || name)) {
      RequestUtils.errorResponse(res, "Bad parameters.  You cannot specify any other parameters along with associatedClassificationIds");
      return;
    }

    performUpdate = function (updateOperation) {
      classifications(db).update(idQuery, updateOperation, queryOptions, function (err, result) {
        console.log("performing update: " + util.inspect(updateOperation) + "\n  idQuery: " + util.inspect(idQuery));
        if (err) {
          RequestUtils.errorResponse(res, "Error updating category/classification properties. " + err);
        } else {
          classificationsDAO.invalidateClassificationMemoryCache();
          console.log("successfully saved changes to category " + id + ". result: " + result);
          res.json(200, null);
        }
      });
    };

    if (associatedClassificationIds) {
      classifications(db).findById(id, function (err, data) {
        if (err) {
          RequestUtils.errorResponse(res, 'Error fetching classification prior to update. ' + (err || ''));
          return;
        }
        console.log("found the classification.... " + util.inspect(data));
        if (data && data.visible !== false) {
          updateOp = {$set: {associatedClassificationIds: associatedClassificationIds}};
          performUpdate(updateOp);
        } else {
          RequestUtils.errorResponse(res, 'You cannot associate a classification with another classification. ' + (err || ''));
        }
      });
    } else {
      if (visible === null) {
        RequestUtils.errorResponse(res, "Error setting visibility of category.  No 'visible' parameter was passed.");
        return;
      }
      if (name !== null && name.trim().length > 0) {
        updateOp.$set.name = name;
      }
      performUpdate(updateOp);
    }
  };
};

exports.setCategoryTypeName = function (db) {
  return function (req, res) {
    var categoryId = req.params.id,
      categoryTypeId = req.params.typeId,
      name = RequestUtils.getFieldIfExists('name', req);

    if (!name || name.trim() === '') {
      RequestUtils.errorResponse(res, "'name' cannot be blank");
      return;
    }

    classifications(db).findById(categoryId, function (err, category) {
      if (err) {
        RequestUtils.errorResponse(res, "Error retrieving category.  Renaming of category type failed.");
        return;
      }
      if (category && _.isArray(category.types)) {
        _.find(category.types, function (catType) {
          if (catType.id === categoryTypeId) {
            catType.name = name;
            return true;
          }
          return false;
        });
      }
      classifications(db).updateById(categoryId, category, function (error) {
        if (error) {
          RequestUtils.errorResponse(res, "Error saving changes to category after catType renamed. " + (error || ''));
        } else {
          classificationsDAO.invalidateClassificationMemoryCache();
          console.log("successfully saved classification for categoryType rename.");
          res.json(category);
        }
      });
    });

  };
};



exports.setCategorySubTypeName = function (db) {
  return function (req, res) {
    var categoryId = req.params.id,
      categoryTypeId = req.params.typeId,
      categorySubTypeId = req.params.subTypeId,
      name = RequestUtils.getFieldIfExists('name', req),
      categoryType;

    if (!name || name.trim() === '') {
      RequestUtils.errorResponse(res, "'name' cannot be blank");
      return;
    }

    classifications(db).findById(categoryId, function (err, category) {
      if (err) {
        RequestUtils.errorResponse(res, "Error retrieving category.  Renaming of category type failed.");
        return;
      }
      if (category && _.isArray(category.types)) {
        categoryType = _.find(category.types, function (catType) {
          if (catType.id === categoryTypeId) {
            return true;
          }
          return false;
        });
        if (categoryType && _.isArray(categoryType.subtypes)) {
          _.find(categoryType.subtypes, function (catSubType) {
            if (catSubType.id === categorySubTypeId) {
              catSubType.name = name;
              return true;
            }
            return false;
          });
        }
      }
      classifications(db).updateById(categoryId, category, function (error) {
        if (error) {
          RequestUtils.errorResponse(res, "Error saving changes to category after catSubType renamed. " + error);
        } else {
          classificationsDAO.invalidateClassificationMemoryCache();
          console.log("successfully saved classification for catSubType rename.");
          res.json(category);
        }
      });
    });

  };
};

exports.addClassification = function (db) {
  return function (req, res) {
    console.log("add classification: req.body is: " + JSON.stringify(req.body, null, 3));
    var classification = newClassificationFromRequest(req);
    console.log("add classification: " + JSON.stringify(classification));
    if (!isValidClassification(classification)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for classification");
      return;
    }
    classifications(db).insert(classification, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error inserting new classification. " + err);
      } else {
        classificationsDAO.invalidateClassificationMemoryCache();
        res.json(201, null);
      }
    });
  };
};


var _addOrRemoveClassificationType = function (db, res, classificationId, classificationType, isAdd) {
  // add example:
  // > db.classifications.update({"_id" : ObjectId("534540e7da140b0000a66717")}, { $push: {"types":{"id":"534540e7da140b0000a66117", "name":"awesome type 42"}}})
  // remove example:
  //> db.classifications.update({"_id" : ObjectId("534540e7da140b0000a66717")}, { $pull: {"types": {"id":"534540e7da140b0000a667f9"}}  })
  var operation = isAdd ? '$push' : '$pull',
    opQuery = isAdd ? {types: classificationType} : {types: {id: classificationType.id}},
    updateOp = {},
    idQuery = RequestUtils.getIdQuery(classificationId, true);
  updateOp['' + operation] = opQuery;
  console.log("updateOp is " + JSON.stringify(updateOp));
  console.log("idQuery object is: " + JSON.stringify(idQuery));
  classifications(db).update(idQuery, updateOp, function (err, result) {
    if (err) {
      RequestUtils.errorResponse(res, "Error " + operation + "-ing classificationType. " + err);
    } else {
      classificationsDAO.invalidateClassificationMemoryCache();
      res.json((isAdd ? 201 : 200), null);
    }
  });
};

var _addOrRemoveClassificationSubType = function (db, res, classificationId, classificationTypeId, classificationSubType, isAdd) {
  console.log("_addOrRemoveClassificationSubType: isAdd: " + isAdd + ",  classificationId: " + classificationId + ", classificationTypeId: " + classificationTypeId + ", sub-type: " + JSON.stringify(classificationSubType));

  classifications(db).findById(classificationId, function (err, result) {
    var i, j, category, catType, indexToDelete;
    if (err) {
      RequestUtils.errorResponse(res, "Error retrieving category with id of " + classificationId + " for " + (isAdd ? 'adding' : 'removing') + " a classification sub-type. " + err);
      return;
    }
    category = result;
    console.log("retrieved category:\n" + JSON.stringify(category));
    for (i = 0; i < category.types.length; i++) {
      catType = category.types[i];
      if (catType.id !== classificationTypeId) {
        continue;
      }
      if (!catType.subtypes) {
        catType.subtypes = [];
      }
      if (isAdd) {
        catType.subtypes.push(classificationSubType);
      } else {
        indexToDelete = null;
        for (j = 0; j < catType.subtypes.length; j++) {
          if (catType.subtypes[j] && catType.subtypes[j].id === classificationSubType.id) {
            indexToDelete = j;
            console.log("found matching subtype id at index " + j);
            break;
          }
        }
        if (indexToDelete !== null) {
          console.log("splicing out item from sub-types array with index of " + indexToDelete);
          catType.subtypes.splice(indexToDelete, 1);
        } else {
          console.log("could not find the proper category sub-type to delete.");
        }
      }
      console.log("category before saving:\n" + JSON.stringify(category));
      classifications(db).updateById(classificationId, category, function (error, saveResult) {
        if (error) {
          RequestUtils.errorResponse(res, "Error saving changes to category after sub-type change. " + error);
        } else {
          classificationsDAO.invalidateClassificationMemoryCache();
          console.log("successfully saved classification.");
          res.json((isAdd ? 201 : 200), null);
        }
      });
    }
  });
};


var _fnAddOrRemoveClassificationType = function (db, isAdd) {
  return function (req, res) {
    var verbalAction = isAdd ? "add" : "remove";
    var classificationId = req.params.id;
    console.log(verbalAction + " classificationType. req.body is: " + JSON.stringify(req.body, null, 3));
    if (!classificationId) {
      RequestUtils.errorResponse(res, "No id was specified for the classification");
      return;
    }
    var classificationTypeName = req.body.name;
    if (isAdd && (!classificationTypeName || classificationTypeName === '')) {
      RequestUtils.errorResponse(res, "No name was specified for the classification type for this '" + verbalAction + "' operation.");
      return;
    }
    var classificationTypeId = null;
    if (isAdd) {
      classificationTypeId = (new ObjectID()).toString();
    } else {
      classificationTypeId = req.params.typeId;
      if (!classificationTypeId || classificationTypeId === '') {
        RequestUtils.errorResponse(res, "No classification type id was specified for this '" + verbalAction + "' operation.");
        return;
      }
    }
    var classificationType = {id: classificationTypeId, name: classificationTypeName};

    if (isAdd && !isValidClassificationType(classificationType)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for classificationType");
      return;
    }
    console.log("classificationType to " + verbalAction + ": " + JSON.stringify(classificationType));
    _addOrRemoveClassificationType(db, res, classificationId, classificationType, isAdd);
  };
};

var fnAddOrRemoveClassificationSubType = function (db, isAdd) {
  return function (req, res) {
    var verbalAction = isAdd ? "add" : "remove";
    var classificationId = req.params.id;
    console.log(verbalAction + " classificationSubType: req.body is: " + JSON.stringify(req.body, null, 3));
    if (!classificationId) {
      RequestUtils.errorResponse(res, "No classification id was specified");
      return;
    }
    var typeId = req.params.typeId;
    if (!typeId || typeId === "") {
      RequestUtils.errorResponse(res, "No typeId was specified");
      return;
    }
    var subTypeName = req.body.name;
    if (isAdd && (!subTypeName || subTypeName === "")) {
      RequestUtils.errorResponse(res, "No sub-type name was specified for this " + verbalAction + " operation.");
      return;
    }
    var subTypeId = null;
    if (isAdd) {
      subTypeId = (new ObjectID()).toString();
    } else {
      subTypeId = req.params.subTypeId;
      if (!subTypeId || subTypeId === '') {
        RequestUtils.errorResponse(res, "No sub-type id was specified for " + verbalAction + " operation.");
        return;
      }
    }
    var classificationSubType = {id: subTypeId, name: subTypeName};

    if (isAdd && !isValidClassificationSubType(classificationSubType)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for classification sub-type");
      return;
    }
    console.log("classificationType to " + verbalAction + ": " + JSON.stringify(classificationSubType));
    _addOrRemoveClassificationSubType(db, res, classificationId, typeId, classificationSubType, isAdd);
  };
};

exports.addClassificationType = function(db) {
  return _fnAddOrRemoveClassificationType(db, true);
};

exports.removeClassificationType = function(db) {
  return _fnAddOrRemoveClassificationType(db, false);
};

exports.addClassificationSubType = function(db) {
  return fnAddOrRemoveClassificationSubType(db, true);
};

exports.removeClassificationSubType = function(db) {
  return fnAddOrRemoveClassificationSubType(db, false);
};

exports.deleteClassification = function(db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("delete classification with id of " + id);
    classifications(db).removeById(id, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting classification. " + err);
      } else {
        classificationsDAO.invalidateClassificationMemoryCache();
        res.json(200, null);
      }
    });
  };
};
