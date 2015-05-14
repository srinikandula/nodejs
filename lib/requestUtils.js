'use strict';

var _ = require('underscore')
  , mongoskin = require('mongoskin')
  , util = require("util")
  , MAX_DISTANCE_IN_METERS_FOR_QUERY = 100 /* kilometers */ * 1000
  , DEFAULT_MAX_DISTANCE_IN_METERS_IF_UNSPECIFIED = 50 /* kilometers */ * 1000;

function parseBool(value) {
  if (_.isUndefined(value) || _.isNull(value)) {
    return false;
  }
  return value === true || value === "true" || value === 1 || value === "1";
}

var RequestUtils = {
  getIdQuery: function (id, allowArbitraryIds) {
    var tmpId;
    try {
      tmpId = new mongoskin.BSONPure.ObjectID(id);
    } catch (err) {
      if (allowArbitraryIds) {
        tmpId = id;
      } else {
        throw err;
      }
    }
    return {_id: tmpId};
  },
  getFieldIfExists : function (fieldName, req) {
    if (req.body.hasOwnProperty(fieldName)) {
      return req.body[fieldName];
    }
    if (req.params[fieldName]) {
      return req.params[fieldName];
    }
    if (req.query[fieldName]) {
      return req.query[fieldName];
    }
    return null;
  },
  isFieldDefined : function (fieldName, req) {
    return req.body.hasOwnProperty(fieldName) || !_.isUndefined(req.params[fieldName]) || !_.isUndefined(req.query[fieldName]);
  },
  /**
   * if the field exists as a request parameter, it returns true/false as appropriate, otherwise returns null
   * if the field does not exist at all
   */
  getBooleanFieldIfExists : function (fieldName, req) {
    if (!req) {
      return null;
    }
    if (req.body.hasOwnProperty(fieldName)) {
      return parseBool(req.body[fieldName]);
    }
    if (req.params[fieldName]) {
      return parseBool(req.params[fieldName]);
    }
    if (req.query[fieldName]) {
      return parseBool(req.query[fieldName]);
    }
    return null;
  },
  /**
   * This is for string-valued properties only
   * @param fieldName
   * @param req
   * @param targetObj
   * @returns {boolean}
   */
  setFieldIfExists : function (fieldName, req, targetObj) {
    var fieldValue = RequestUtils.getFieldIfExists(fieldName, req);
    if (fieldValue !== null) {
      targetObj[fieldName] = fieldValue;
      return true;
    }
    return false;
  },
  /**
   * This is for string-valued properties only
   * @param fieldNames
   * @param req
   * @param targetObj
   */
  setFieldsIfExist : function (fieldNames, req, targetObj) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        RequestUtils.setFieldIfExists(fieldName, req, targetObj);
      });
    } else if (_.isString(fieldNames)) {
      RequestUtils.setFieldIfExists(fieldNames, req, targetObj);
    }
  },
  setFieldAsFloatIfExists : function (fieldName, req, targetObj) {
    if (req.body.hasOwnProperty(fieldName)) {
      targetObj[fieldName] = parseFloat(req.body[fieldName]);
    } else if (req.params[fieldName]) {
      targetObj[fieldName] = parseFloat(req.params[fieldName]);
    } else if (req.query[fieldName]) {
      targetObj[fieldName] = parseFloat(req.query[fieldName]);
    } else {
      return false;
    }
    return true;
  },
  setFieldsAsFloatIfExist : function (fieldNames, req, targetObj) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        RequestUtils.setFieldAsFloatIfExists(fieldName, req, targetObj);
      });
    } else if (_.isString(fieldNames)) {
      RequestUtils.setFieldAsFloatIfExists(fieldNames, req, targetObj);
    }
  },
  setFieldAsBooleanIfExists : function (fieldName, req, targetObj) {
    if (req.body.hasOwnProperty(fieldName)) {
      targetObj[fieldName] = parseBool(req.body[fieldName]);
    } else if (req.params[fieldName]) {
      targetObj[fieldName] = parseBool(req.params[fieldName]);
    } else if (req.query[fieldName]) {
      targetObj[fieldName] = parseBool(req.query[fieldName]);
    } else {
      return false;
    }
    return true;
  },
  setFieldsAsBooleanIfExist : function (fieldNames, req, targetObj) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        RequestUtils.setFieldAsBooleanIfExists(fieldName, req, targetObj);
      });
    } else if (_.isString(fieldNames)) {
      RequestUtils.setFieldAsBooleanIfExists(fieldNames, req, targetObj);
    }
  },
  setFieldAsIntIfExists : function (fieldName, req, targetObj) {
    if (req.body.hasOwnProperty(fieldName)) {
      targetObj[fieldName] = parseInt(req.body[fieldName], 10);
    } else if (req.params[fieldName]) {
      targetObj[fieldName] = parseInt(req.params[fieldName], 10);
    } else if (req.query[fieldName]) {
      targetObj[fieldName] = parseInt(req.query[fieldName], 10);
    } else {
      return false;
    }
    return true;
  },
  setFieldsAsIntIfExist : function (fieldNames, req, targetObj) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        RequestUtils.setFieldAsIntIfExists(fieldName, req, targetObj);
      });
    } else if (_.isString(fieldNames)) {
      RequestUtils.setFieldAsIntIfExists(fieldNames, req, targetObj);
    }
  },
  errorResponse : function (res, msg, code) {
    console.log('errorResponse: ' + msg);
    var errorCode = code || 400;
    res.json(errorCode, {error: msg});
  },
  forbiddenResponse: function (res, msg) {
    this.errorResponse(res, msg, 403);
  },
  buildQueryObjectWithParser : function (queryObject, fieldNames, req, parserFunction) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        if (fieldName && fieldName.toString().trim() !== '') {
          if (RequestUtils.setFieldIfExists(fieldName, req, queryObject)) {
            queryObject[fieldName] = parserFunction(queryObject[fieldName]);
          }
        }
      });
    }
    return queryObject;
  },
  buildQueryObjectForCategoryHierarchy: function (queryObject, req) {
//    if (categoryId && categoryId.toString().trim() !== '') {
    var catId = RequestUtils.getFieldIfExists('categoryId', req)
      , catTypeId = RequestUtils.getFieldIfExists('categoryTypeId', req)
      , catSubTypeId = RequestUtils.getFieldIfExists('categorySubTypeId', req);
    if (catId && catTypeId && catSubTypeId) {
      queryObject.categorySubTypeIds = catId + ':' + catTypeId + ':' + catSubTypeId;
    } else if (catId && catTypeId) {
      queryObject.categoryTypeIds = catId + ':' + catTypeId;
    } else if (catId) {
      queryObject.categoryIds = catId;
    }
    return queryObject;
  },
  buildQueryObjectForStrings : function (queryObject, fieldNames, req) {
    return RequestUtils.buildQueryObjectWithParser(queryObject, fieldNames, req, _.identity);
  },
  buildQueryObjectForBooleans : function (queryObject, fieldNames, req) {
    return RequestUtils.buildQueryObjectWithParser(queryObject, fieldNames, req, parseBool);
  },
  buildQueryObjectForArrayOfStrings : function (queryObject, fieldNames, req) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        if (fieldName && fieldName.toString().trim() !== '') {
          var fieldVal = RequestUtils.getFieldIfExists(fieldName, req);
          if (fieldVal) {
            if (_.isArray(fieldVal)) {
              queryObject[fieldName] = { $in : fieldVal};
            } else {
              queryObject[fieldName] = fieldVal;
            }
          }
        }
      });
    }
  },
  buildQueryObjectForIntegers : function (queryObject, fieldNames, req) {
    return RequestUtils.buildQueryObjectWithParser(queryObject, fieldNames, req, parseInt);
  },
  buildQueryObjectForFloats : function (queryObject, fieldNames, req) {
    return RequestUtils.buildQueryObjectWithParser(queryObject, fieldNames, req, parseFloat);
  },
  buildQueryObjectForRegexes : function (queryObject, fieldNames, req) {
    if (_.isArray(fieldNames)) {
      _.each(fieldNames, function (fieldName) {
        if (fieldName && fieldName.toString().trim() !== '') {
          var fieldVal = RequestUtils.getFieldIfExists(fieldName, req);
          if (fieldVal) {
            queryObject[fieldName] = new RegExp(fieldVal, 'i');
          }
        }
      });
    }
    return queryObject;
  },
  buildQueryObjectForGeospatialNear : function (queryObject, locationKeyName, longitude, latitude, maxDistanceMeters) {
    // > db.businesses.find({"loc": { $near : {$geometry: {"type": "Point", "coordinates": [10.0, 10.0]}, $maxDistance: 100000.0} } }).pretty()
    if (longitude && latitude && locationKeyName) {
      var pointQuery = {"type": "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)]}
        , geoQuery = {$geometry: pointQuery};
      if (maxDistanceMeters && parseFloat(maxDistanceMeters) > 0) {
        geoQuery.$maxDistance = Math.min(parseFloat(maxDistanceMeters), MAX_DISTANCE_IN_METERS_FOR_QUERY);
      } else {
        geoQuery.$maxDistance = DEFAULT_MAX_DISTANCE_IN_METERS_IF_UNSPECIFIED;
      }
      queryObject[locationKeyName] = {$near: geoQuery};
    }
    return queryObject;
  },
  getMongoSortDirectionFromOrderDir: function (req) {
    var sortDirection = RequestUtils.getFieldIfExists('orderDir', req)
      , mongoSortDirection = 1;
    if (sortDirection && sortDirection !== '') {
      if (sortDirection === 'asc' || sortDirection === '1') {
        mongoSortDirection = 1;
      } else if (sortDirection === 'desc' || sortDirection === '-1') {
        mongoSortDirection = -1;
      }
      console.log("mongoSortDirection is " + mongoSortDirection);
      return mongoSortDirection;
    }
  },
  buildSortExpression: function (queryObject, req) {
    var sortField = RequestUtils.getFieldIfExists('orderBy', req)
      , sortDirection = RequestUtils.getFieldIfExists('orderDir', req);
    if (sortField && sortField !== '') {
      if (sortDirection && sortDirection !== '') {
        queryObject[sortField] = this.getMongoSortDirectionFromOrderDir(req);
      }
    }
    return queryObject;
  },
  logRequestParams: function (req, prefix) {
    var pre = '';
    if (req) {
      if (prefix) {
        pre = prefix + ' - ';
      }
      console.log(pre + "req.params is: " + JSON.stringify(req.params));
      console.log(pre + "req.query is: " + JSON.stringify(req.query));
      console.log(pre + "req.body is: " + JSON.stringify(req.body));
    }
  },
  isLoggedIn: function (req) {
    return req.user && req.user.status === 'ENABLED';
  },
  redirectIfNotLoggedIn: function (req, res) {
    if (this.isLoggedIn(req)) {
      return false;
    }
    res.redirect('/login');
    return true;
  },
  /**
   * returns a 401 error response to the user as json.
   * @returns {boolean} true if the request was unauthenticated
   */
  unauthenticatedErrorResponseIfNotLoggedIn: function (req, res) {
    if (this.isLoggedIn(req)) {
      return false;
    }
    this.errorResponse(res, 'Not logged in', 401);
    return true;
  },
  performIfAdmin: function (req, res, callback) {
    if (this.isLoggedIn(req)) {
      var that = this;
      req.user.getGroups({name: 'Admin'}, function (err, groups) {
        if (err) {
          RequestUtils.errorResponse(res, 'error getting groups. ' + err);
        } else {
          if (groups && groups.items.length === 1 && groups.items[0].name === 'Admin') {
            callback(null);
          } else {
            that.errorResponse(res, 'Unauthorized...' + util.inspect(groups), 403);
          }
        }
      });
    } else {
      this.errorResponse(res, 'Unauthorized', 403);
    }
  }
};

module.exports = RequestUtils;