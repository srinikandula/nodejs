"use strict";

var _ = require('underscore'),
  neighborhoodGeoDAO = require('../lib/dao/neighborhoodGeoDAO'),
  RequestUtils = require('../lib/requestUtils'),
  JSONResponseUtils = require('../lib/jsonResponseUtils'),
  util = require('util'),
  mongoskin = require('mongoskin'),
  async = require('async'),
  SecurityUtils = require('../lib/securityUtils');



/**
 * transforms a raw database result to a more palatable DTO
 * @param obj
 * the raw database results (array or single object).
 */
var transformToNeighborhoodGeoDTO = function (obj, req) {
  // The raw schema should look like this:
  //{
  //  "_id" : ObjectId("53e9465b487f0910f9f6cb56"),
  //  "name" : "Yorkville",
  //  "geo_name" : "Yorkville",
  //  "city" : "New York",
  //  "level" : 3,
  //  "position" : 2,
  //  "path" : "yorkville-manhattan",
  //  "parent_path" : "ues-manhattan",
  //  "parent_name" : "All Upper East Side",
  //  "parent_id" : 139,
  //  "geometry" : ................... GEOJSON POLYGON DATA
  //},
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }

  var objToDTO = function (rawObj) {
    JSONResponseUtils.replaceIdField(rawObj);
    if (rawObj.geometry && _.isArray(rawObj.geometry.coordinates) && rawObj.geometry.coordinates.length === 2 && !_.isArray(rawObj.geometry.coordinates[0])) {
      rawObj.long = rawObj.geometry.coordinates[0];
      rawObj.lat = rawObj.geometry.coordinates[1];
    }
    if (!RequestUtils.getBooleanFieldIfExists('geo', req)) {
      delete rawObj.geometry;
    }
    delete rawObj.path;
    delete rawObj.parent_path;
    delete rawObj.parent_name;
    delete rawObj.position;
    delete rawObj.api_id;
    delete rawObj.api_parent_id;
    delete rawObj.geo_name;
  }
  , len = 0;

  if (_.isArray(obj)) {
    // remove neighborhoods that do not have any POIs (unless the request is from the web portal)
    if (!RequestUtils.getBooleanFieldIfExists('isPortal', req)) {
      console.log("non-portal request for neighborhoodGeos");
      len = obj.length;
      while (len--) {
        if (!obj[len].poiCount || obj[len].poiCount < 1) {
          obj.splice(len, 1);
        }
      }
    }
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};


/**
 * transforms a raw database result to a more palatable city DTO
 * @param obj
 * the raw database results (array or single object).
 */
var transformToCityDTO = function (obj, req) {
  // The raw schema should look like this:
  //{
  //  "_id" : ObjectId("53e9465b487f0910f9f6cb56"),
  //  "name" : "Yorkville",
  //  "geo_name" : "Yorkville",
  //  "city" : "New York",
  //  "level" : 3,
  //  "position" : 2,
  //  "path" : "yorkville-manhattan",
  //  "parent_path" : "ues-manhattan",
  //  "parent_name" : "All Upper East Side",
  //  "parent_id" : 139,
  //  "geometry" : ................... GEOJSON POLYGON DATA
  //},
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var objToDTO = function (rawObj) {
    JSONResponseUtils.replaceIdField(rawObj);
    if (rawObj.geometry && _.isArray(rawObj.geometry.coordinates) && rawObj.geometry.coordinates.length === 2) {
      rawObj.long = rawObj.geometry.coordinates[0];
      rawObj.lat = rawObj.geometry.coordinates[1];
    }
    delete rawObj.geometry;
    delete rawObj.geo_name;
    delete rawObj.path;
    delete rawObj.parent_path;
    delete rawObj.position;
    delete rawObj.api_id;
    delete rawObj.api_parent_id;
  },
    len = 0;
  if (_.isArray(obj)) {
    // remove neighborhoods that do not have any POIs (unless the request is from the web portal)
    if (!RequestUtils.getBooleanFieldIfExists('isPortal', req)) {
      console.log("non portal request for neighborhoodGeos");
      len = obj.length;
      while (len--) {
        if (!obj[len].poiCount && obj[len].poiCount > 0) {
          obj.splice(len, 1);
        }
      }
    }
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};

var sortNeighborhoodArrayByName = function (neighArray) {
  if (_.isArray(neighArray)) {
    return _.sortBy(neighArray, 'name');
  }
  return neighArray;
};


/**
 * flattens a tree structure
 * @param neighborhoodsToFlatten array of neighborhoods
 * @param flattenedList an array in which the flattened results will be placed
 */
var flattenNeighborhoodTree = function (neighborhoodsToFlatten, flattenedList) {
  neighborhoodsToFlatten.forEach(function (val) {
    flattenedList.push(val);
    if (val.children) {
      flattenNeighborhoodTree(val.children, flattenedList);
    }
    delete val.children;
  });
};



/**
 * returns a tree structure of neighborhoods.  This will always be an array with one or
 * more top-level neighborhoods.
 * @param neighborhoodList a flattened list of neighborhoods
 * @param parentId
 * @param flattenAtDepth (optional) maximum number of levels deep the tree will be.  children beyond that wll be flattened
 * into their ancestor at the max depth
 * @returns an array
 */
var createTreeStructFromNeighborhoods = function (neighborhoodList, parentId, flattenAtDepth) {
  var highestLevel, parentsAndAllOtherChildren, results;
  if (!_.isArray(neighborhoodList) || _.isEmpty(neighborhoodList)) {
    return [];
  }
  if (!flattenAtDepth || !_.isNumber(flattenAtDepth)) {
    flattenAtDepth = 100;
  }
  if (!parentId) {
    highestLevel = _.min(neighborhoodList, function (val) {
      return val.level;
    }).level;
  }
  parentsAndAllOtherChildren = _.groupBy(neighborhoodList, function (val) {
    if (parentId) {
      return val.parentId === parentId ? "topLevelItems" : "otherKids";
    }
    return val.level === highestLevel ? "topLevelItems" : "otherKids";
  });
  if (_.isEmpty(parentsAndAllOtherChildren.topLevelItems)) {
    return [];
  }
  results = _.each(parentsAndAllOtherChildren.topLevelItems, function (val) {
    val.children = createTreeStructFromNeighborhoods(parentsAndAllOtherChildren.otherKids, val.id.toString(), flattenAtDepth - 1);
  });
  if (flattenAtDepth === 1) {
    flattenNeighborhoodTree(results, results);
  }
  return _.sortBy(_.uniq(results), 'name');
};


exports.findNeighborhoods = function (db) {
  return function (req, res) {
    var lon = parseFloat(RequestUtils.getFieldIfExists('long', req))
      , lat = parseFloat(RequestUtils.getFieldIfExists('lat', req))
      , city = RequestUtils.getFieldIfExists('city', req)
      , state = RequestUtils.getFieldIfExists('state', req)
      , isRecursive = RequestUtils.getBooleanFieldIfExists('recursive', req)
      , isTree = RequestUtils.getBooleanFieldIfExists('tree', req)
      , flattenAtDepth = parseInt(RequestUtils.getFieldIfExists('flattenAtDepth', req), 10) || 100
      , cb;

    RequestUtils.logRequestParams(req, "findNeighborhoods() - ");

    if ((city || state) && (lat || lon)) {
      RequestUtils.errorResponse(res, "You may only specify lat/long or city/state, not both.");
      return;
    }

    cb = function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding neighborhood... " + util.inspect(err));
      } else {
        if (isRecursive) {
          var currentIds = _.map(data, function (v) {
            return v._id.toString();
          });
          neighborhoodGeoDAO.findNeighborhoodsByParentIdsRecursive(db, currentIds, data, function (error, results) {
            if (error) {
              RequestUtils.errorResponse(res, "Error finding neighborhood for lon/lat. " + util.inspect(error));
            } else {
              console.log("neighborhoods found: " + _.size(results));
              transformToNeighborhoodGeoDTO(results, req);
              if (isTree) {
                results = createTreeStructFromNeighborhoods(results, null, flattenAtDepth);
              } else {
                results = sortNeighborhoodArrayByName(results);
              }
              res.json(results);
            }
          });
        } else {
          console.log("neighborhoods found: "  + _.size(data));
          transformToNeighborhoodGeoDTO(data, req);
          if (isTree) {
            data = createTreeStructFromNeighborhoods(data, null, flattenAtDepth);
          } else {
            data = sortNeighborhoodArrayByName(data);
          }
          res.json(data);
        }
      }
    };

    if (lon && lat) {
      if (isRecursive) {
        RequestUtils.errorResponse(res, "the 'recursive' flag cannot be used in conjunction with 'lat' and 'long' parameters");
        return;
      }
      neighborhoodGeoDAO.findNeighborhoodsForLonLat(db, lon, lat, function (err, data) {
        if (err) {
          RequestUtils.errorResponse(res, "Error finding neighborhood for lon/lat. " + util.inspect(err));
        } else {
          console.log("neighborhoods found: " + _.size(data));
          transformToNeighborhoodGeoDTO(data, req);
          res.json(data);
        }
      });
    } else if (city && state) {
      neighborhoodGeoDAO.findByCityState(db, city, state, function (err, data) {
        if (err) {
          cb(err, null);
        } else {
          if (_.isArray(data) && data.length > 0) {
            neighborhoodGeoDAO.findNeighborhoodsByParentId(db, data[0]._id.toString(), cb);
          } else {
            cb(null, data);
          }
        }
      });
    } else {
      RequestUtils.errorResponse(res, "Bad/missing parameters");
    }
  };
};


exports.findById = function (db) {
  return function (req, res) {
    var id = req.params.id;
    if (!id) {
      RequestUtils.errorResponse(res, "id must be specified");
      return;
    }
    neighborhoodGeoDAO.findById(db, id, function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding neighborhoodGeo with id of " + id + '. ' + err);
      } else {
        transformToNeighborhoodGeoDTO(data, req);
        res.json(data);
      }
    });
  };
};

exports.findNeighborhoodsByParentId = function (db) {
  return function (req, res) {
    var parentId = RequestUtils.getFieldIfExists('id', req)
      , isTree = RequestUtils.getBooleanFieldIfExists('tree', req)
      , flattenAtDepth = parseInt(RequestUtils.getFieldIfExists('flattenAtDepth', req), 10) || 100
      , callback;
    RequestUtils.logRequestParams(req, "findNeighborhoodsByParentId() - ");

    if (!parentId) {
      RequestUtils.errorResponse(res, "'id' must be specified");
      return;
    }
    callback = function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding neighborhoods for parentId. " + err);
      } else {
        console.log("neighborhoods found: " + _.size(data));
        transformToNeighborhoodGeoDTO(data, req);
        if (isTree) {
          console.log("transforming results to tree...");
          data = createTreeStructFromNeighborhoods(data, parentId, flattenAtDepth);
        }
        res.json(data);
      }
    };
    if (RequestUtils.getBooleanFieldIfExists('recursive', req)) {
      neighborhoodGeoDAO.findNeighborhoodsByParentIdsRecursive(db, [parentId], [], callback);
    } else {
      neighborhoodGeoDAO.findNeighborhoodsByParentId(db, parentId, callback);
    }

  };
};


exports.findAll = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, "findAll() - ");
    neighborhoodGeoDAO.findAll(db, function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error getting all neighborhoodGeo entries");
      } else {
        transformToNeighborhoodGeoDTO(data, req);
        res.json(data);
      }
    });
  };
};


exports.findCityByCityAndState = function (db) {
  return function (req, res) {
    var city = RequestUtils.getFieldIfExists('city', req),
      state = RequestUtils.getFieldIfExists('state', req);

    RequestUtils.logRequestParams(req, "findCityByCityAndState() - ");
    if (_.isEmpty(city) || _.isEmpty(state)) {
      RequestUtils.errorResponse(res, "No 'city' or 'state' parameter was specified.");
      return;
    }
    console.log(util.format("get city: city: '%s', state: '%s'", city, state));

    neighborhoodGeoDAO.findByCityState(db, city, state, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, util.format("error finding city: '%s', state: '%s'.  %s", city, state, err));
      } else {
        transformToCityDTO(item);
        if (_.isArray(item)) {
          if (item.length > 0) {
            item = item[0];
          }
        }
        res.json(item);
      }
    });
  };
};


exports.findCities = function (db) {
  return function (req, res) {
    var lat = parseFloat(RequestUtils.getFieldIfExists('lat', req)),
      long = parseFloat(RequestUtils.getFieldIfExists('long', req)),
      maxDistance = parseFloat(RequestUtils.getFieldIfExists('maxDistance', req));
    RequestUtils.logRequestParams(req, "findCities() - ");
    if (lat && long) {
      console.log("Retrieving nearby cities.  long is " + long + ", lat is " + lat);
      neighborhoodGeoDAO.findNearestCities(db, long, lat, maxDistance, function (err, data) {
        if (err) {
          RequestUtils.errorResponse(res, "Error finding nearby cities");
        } else {
          transformToCityDTO(data, req);
          res.json(data);
        }
      });
    } else {
      console.log("Retrieving ALL cities...");
      neighborhoodGeoDAO.findAllCities(db, function (err, data) {
        if (err) {
          RequestUtils.errorResponse(res, "Error fetching all cities... " + err);
          return;
        }
        transformToCityDTO(data, req);
        res.json(data);
      });
    }
  };
};

var isValidNeighborhoodGeo = function (neighborhoodGeo) {
  return neighborhoodGeo && neighborhoodGeo.name && neighborhoodGeo.city && neighborhoodGeo.state;
};

var neighborhoodGeoFromRequest = function (req) {
  if (req) {
    var neighborhoodGeo = {};
    if (req.params.id) {
      neighborhoodGeo._id = req.params.id;
    }
    if (req.body.hasOwnProperty('geometry') && req.body.geometry.hasOwnProperty('coordinates') && req.body.geometry.coordinates.length === 2) {
      neighborhoodGeo.geometry = {'type': 'Point', 'coordinates': [parseFloat(req.body.geometry.coordinates[0]) || null, parseFloat(req.body.geometry.coordinates[1]) || null]};
    } else if (req.body.hasOwnProperty('long') && req.body.hasOwnProperty('lat')) {
      neighborhoodGeo.geometry = {'type': 'Point', 'coordinates': [parseFloat(req.body.long) || null, parseFloat(req.body.lat) || null]};
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'geo_name',
      'city',
      'state',
      'path',
      'parent_path',
      'parent_name',
      'parentId'
    ], req, neighborhoodGeo);
    RequestUtils.setFieldsAsIntIfExist([
      'level',
      'position'
    ], req, neighborhoodGeo);
    return neighborhoodGeo;
  }
  return null;
};


exports.deleteNeighborhood = function (db) {
  return function (req, res) {
    var id = req.params.id
      , isRecursive = RequestUtils.getBooleanFieldIfExists('recursive', req);
    // ToDo -- admin only function... and isRecursive might need some extra restrictions too
    if (!id) {
      RequestUtils.errorResponse(res, "id must be specified");
      return;
    }
    neighborhoodGeoDAO.deleteNeighborhoodGeo(db, id, isRecursive, function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "error deleting neighborhood. " + util.inspect(err));
      } else {
        res.json(204, null);
      }
    });
  };
};

exports.updateCity = function (db) {
  return function (req, res) {
    var id = req.params.id
      , latitude = parseFloat(RequestUtils.getFieldIfExists('lat', req))
      , longitude = parseFloat(RequestUtils.getFieldIfExists('long', req))
      , geoValue, callback;

    RequestUtils.logRequestParams(req, "updateCity()");

    if (!RequestUtils.isFieldDefined('lat', req) || !RequestUtils.isFieldDefined('long', req)) {
      RequestUtils.errorResponse(res, "lat/lon not specified.");
      return;
    }

    callback = function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "error changing lat/lon for city. " + util.inspect(err));
        return;
      }
      console.log("changed city. " + util.inspect(data));
      res.json(data);
    };
    geoValue = (latitude && longitude) ? {"type": "Point", coordinates: [longitude, latitude]} : null;
    if (geoValue) {
      console.log("updating geometry for city: " + util.inspect(geoValue));
      neighborhoodGeoDAO.updateNeighborhoodGeoById(db, id, geoValue, callback);
    } else {
      console.log("unsetting geometry for city");
      neighborhoodGeoDAO.unsetGeometry(db, id, callback);
    }
  };
};


exports.addNeighborhood = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, "addNeighborhood()");
    var neighborhood = neighborhoodGeoFromRequest(req);

    console.log("add neighborhood: " + JSON.stringify(neighborhood));
    if (!isValidNeighborhoodGeo(neighborhood)) {
      RequestUtils.errorResponse(res, "Bad/missing properties for neighborhood");
      return;
    }

    if (neighborhood.level === 0) {
      if (neighborhood.city !== neighborhood.name) {
        RequestUtils.errorResponse(res, "The 'city' and 'name' fields did not match for this city (level 0).");
        return;
      }
      // first, check if city already exists
      neighborhoodGeoDAO.findByCityState(db, neighborhood.city, neighborhood.state, function (err, data) {
        if (err) {
          RequestUtils.errorResponse(res, "An error occurred trying to check for the existence of a city. " + util.inspect(err));
          return;
        }
        if (!_.isEmpty(data)) {
          RequestUtils.errorResponse(res, "That city already exists!", 409);
        } else {
          neighborhood.createdAt = new Date();
          neighborhoodGeoDAO.addNeighborhood(db, neighborhood, function (err, result) {
            if (err) {
              RequestUtils.errorResponse(res, "Error inserting new city. " + err);
            } else {
              transformToNeighborhoodGeoDTO(result, req);
              res.json(201, result);
            }
          });
        }
      });
    } else {  // not a top-level city, so it must be a child
      if (!neighborhood.parentId) {
        RequestUtils.errorResponse(res, "parentId is missing");
        return;
      }
      // is this a duplicate name?
      neighborhoodGeoDAO.findByNameAndParent(db, neighborhood.name, neighborhood.parentId, function (err, result) {
        if (err) {
          RequestUtils.errorResponse(res, "Error inserting new neighborhood due to failure querying for duplicates. " + util.inspect(err));
        } else {
          if (!_.isEmpty(result)) {
            RequestUtils.errorResponse(res, "That neighborhood already exists!", 409);
            return;
          }
          neighborhoodGeoDAO.addNeighborhood(db, neighborhood, function (err, result) {
            if (err) {
              RequestUtils.errorResponse(res, "Error inserting new neighborhood. " + err);
            } else {
              transformToNeighborhoodGeoDTO(result, req);
              res.json(201, result);
            }
          });
        }
      });
    }
  };
};

exports.calculateAndSetPOICountForNeighborhoodGeo = function (db) {
  return function (req, res) {
    var neighGeoId = RequestUtils.getFieldIfExists('neighGeoId', req);
    neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, neighGeoId, function (err, data) {
      if (err) {
        RequestUtils.errorResponse(res, "Error getting POI count for neighGeoId " + neighGeoId + ". " + err);
      } else {
        console.log("found poi count of " + data + "for neighborhood geo id " + neighGeoId);
        res.json({"poi_count": data});
      }
    });
  };
};
