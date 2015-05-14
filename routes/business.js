"use strict";

var _ = require('underscore'),
  RequestUtils = require('../lib/requestUtils'),
  JSONResponseUtils = require('../lib/jsonResponseUtils'),
  util = require('util'),
  mongoskin = require('mongoskin'),
  ObjectID = mongoskin.BSONPure.ObjectID,
  async = require('async'),
  SecurityUtils = require('../lib/securityUtils'),
  Roles = SecurityUtils.ROLES,
  GLOBAL_PENDING_NEIGHBORHOOD_NAME = require('./neighborhood').GLOBAL_PENDING_NEIGHBORHOOD_NAME,
  neighborhoodDAO = require('../lib/dao/neighborhoodDAO'),
  businessDAO = require('../lib/dao/businessDAO'),
  businessImagesDAO = require('../lib/dao/businessImagesDAO'),
  classificationsDAO = require('../lib/dao/classificationsDAO'),
  neighborhoodGeoDAO = require('../lib/dao/neighborhoodGeoDAO'),
  daoUtils = require('../lib/dao/daoUtils'),
  MAX_RESULTS_FOR_GEO_QUERY = 250,
  W640_TRANFORM_PARAMS = 'c_scale,w_640',
  SNAPPLE_TRANSFORMATION_PARAMS = 'c_crop,h_80,w_640,q_70';

var COLL_BUSINESSES = 'businesses';
var COLL_BUSSINESS_IMAGES = 'busImages';

var businesses = function (db) {
  return db.collection(COLL_BUSINESSES);
};


var getSnappleImageUrl = function (baseCloudinaryImageUrl, customCloudinaryXform) {
  if (!baseCloudinaryImageUrl) {
    return '';
  }
  var croppedUrl, splitUrlWithoutExtension
    , snappleXformParams = customCloudinaryXform || SNAPPLE_TRANSFORMATION_PARAMS;
  if (process.env.CLOUDINARY_POI_IMG_XFORM && baseCloudinaryImageUrl.indexOf("/upload/" + process.env.CLOUDINARY_POI_IMG_XFORM) > 0) {
    croppedUrl = baseCloudinaryImageUrl.replace("/upload/" + process.env.CLOUDINARY_POI_IMG_XFORM, "/upload/" + process.env.CLOUDINARY_POI_IMG_XFORM + "/" + snappleXformParams);
  } else {
    croppedUrl = baseCloudinaryImageUrl.replace("/upload", "/upload/" + W640_TRANFORM_PARAMS + '/' + snappleXformParams);
  }
  splitUrlWithoutExtension = croppedUrl.split('.');
  splitUrlWithoutExtension.pop();
  return splitUrlWithoutExtension.join('.') + '.jpg';
};

exports.getSnappleImageUrl = getSnappleImageUrl;

var formatNeighborhoodsList = function (neighborhoods) {
  if (_.isArray(neighborhoods)) {
    return neighborhoods.sort().join(', ');
  }
  return '';
};

var formatCategoryDisplayValue = function (categoryIds, classificationsMap) {
  var uniqueCategoryIds = _.uniq(categoryIds)
    , classificationNames = [];
  if (_.isArray(uniqueCategoryIds)) {
    uniqueCategoryIds.forEach(function (catId) {
      if (classificationsMap[catId] && classificationsMap[catId].name) {
        classificationNames.push(classificationsMap[catId].name);
      }
    });
    return classificationNames.sort().join(', ');
  }
  return '';
};

var formatCategoryTypeDisplayValue = function (categoryTypeIds, categoryTypesMap) {
  var uniqueCategoryTypeIds = _.uniq(categoryTypeIds) || []
    , categoryTypeNames = [];
  uniqueCategoryTypeIds.forEach(function (catTypeId) {
    if (categoryTypesMap[catTypeId] && categoryTypesMap[catTypeId].name) {
      categoryTypeNames.push(categoryTypesMap[catTypeId].name);
    }
  });
  return categoryTypeNames.sort().join(', ');
};

var formatCategorySubTypeDisplayValue = function (categorySubTypeIds, categorySubTypesMap) {
  var uniqueCategorySubTypeIds = _.uniq(categorySubTypeIds) || []
    , categorySubTypeNames = [];
  uniqueCategorySubTypeIds.forEach(function (catSubTypeId) {
    if (categorySubTypesMap[catSubTypeId] && categorySubTypesMap[catSubTypeId].name) {
      categorySubTypeNames.push(categorySubTypesMap[catSubTypeId].name);
    }
  });
  return categorySubTypeNames.sort().join(', ');
};


var pruneInvalidCategoryValues = function (business, validClassificationIdsMap) {
  if (!business || !validClassificationIdsMap) {
    return;
  }
  ['categoryIds', 'categoryTypeIds', 'categorySubTypeIds'].forEach(function (key) {
    if (business.hasOwnProperty(key) && !_.isEmpty(business[key])) {
      business[key] = _.uniq(_.where(business[key], function (val) {
        return validClassificationIdsMap.hasOwnProperty(val);
      }));
    }
  });
};

/**
 * Transforms a raw business POJO (as is returned from a mongo query) and transforms it into a more standard format.
 *
 * @param obj the raw business POJO
 * @param req (optional) the request.  used for security to determine if certain fields should or shouldn't be hidden
 * @param options (optional) Object used to adjust the output format.  possible values are:
 */
var transformToBusinessDTO = function (obj, req, options) {
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var isPortal = options && options.isPortal
    , classificationsMap = {}
    , classificationKeys = []
    , validClassificationIdsMap = null
    , objToDTO = function (rawObj) {
    JSONResponseUtils.appendLatLongIfExist(rawObj, true);
    JSONResponseUtils.replaceIdField(rawObj);
    if (!SecurityUtils.canViewPublishedFlag(req)) {
      if (!_.isUndefined(rawObj.published)) {
        delete rawObj.published;
      }
    }
    classificationsMap = options ? (options.classificationsMap || {}) : {};
    if (isPortal || (options && options.showCategoryDisplayValue)) {
      rawObj.neighborhoodsDisplayValue = formatNeighborhoodsList(rawObj.neighborhoods);
      rawObj.categoryDisplayValue = formatCategoryDisplayValue(rawObj.categoryIds, classificationsMap, options.excludedCategoryNames);
    }
    if (!validClassificationIdsMap && !_.isEmpty(classificationsMap)) {
      validClassificationIdsMap = getValidClassificationIdsMap(classificationsMap);
    }
    pruneInvalidCategoryValues(rawObj, validClassificationIdsMap);
    if (isPortal && options && options.shouldIncludeSubCatCount) {
      rawObj.subCatCount = (_.isEmpty(rawObj.categoryTypeIds) ? 0 : rawObj.categoryTypeIds.length);
    }
    if (options) {
      if (options.showCategoryTypesDisplayValue && options.categoryTypesMap) {
        rawObj.categoryTypesDisplayValue = formatCategoryTypeDisplayValue(rawObj.categoryTypeIds, options.categoryTypesMap);
      }
      if (options.showCategorySubTypesDisplayValue && options.categorySubTypesMap) {
        rawObj.categorySubTypesDisplayValue = formatCategorySubTypeDisplayValue(rawObj.categorySubTypeIds, options.categorySubTypesMap);
      }
    }

    if (!(options && options.includeImportedDetails)) {
      delete rawObj.imported_data;
    }

    // prune non-associated classification fields
    classificationKeys = _.filter(_.keys(rawObj), function (key) { return key.match(/^class_(\w+)_(\w+)/); });
    _.each(classificationKeys, function (classificationKey) {
      var classificationId = classificationKey.match(/^class_(\w+)_(\w+)/)[1];
      if (!classificationsDAO.isClassificationAssociatedWithCategory(classificationId, rawObj.categoryIds, classificationsMap)) {
        delete rawObj[classificationKey];
      }
    });

  };
  if (_.isArray(obj)) {
    _.each(obj, objToDTO);
    if (options && options.orderBySubCatCount) {
      obj.sort(function (a, b) {
        if (!a.subCatCount && !b.subCatCount) {
          return 0;
        }
        if (!a.subCatCount && b.subCatCount) {
          return -options.orderBySubCatCount;
        }
        if (a.subCatCount && !b.subCatCount) {
          return options.orderBySubCatCount;
        }
        return options.orderBySubCatCount === 1 ? a.subCatCount - b.subCatCount : b.subCatCount - a.subCatCount;
      });
    }
    if (options && options.orderByNonDefaultImageCount) {
      obj.sort(function (a, b) {
        if (!a.nonDefaultImageCount && !b.nonDefaultImageCount) {
          return 0;
        }
        if (!a.nonDefaultImageCount && b.nonDefaultImageCount) {
          return -options.orderByNonDefaultImageCount;
        }
        if (a.nonDefaultImageCount && !b.nonDefaultImageCount) {
          return options.orderByNonDefaultImageCount;
        }
        return options.orderByNonDefaultImageCount === 1 ? a.nonDefaultImageCount - b.nonDefaultImageCount : b.nonDefaultImageCount - a.nonDefaultImageCount;
      });
    }
    if (options && options.orderByLongitude) {
      obj.sort(function (a, b) {
        if (!a.long && !b.long) {
          return 0;
        }
        if (!a.long && b.long) {
          return -options.orderByLongitude;
        }
        if (a.long && !b.long) {
          return options.orderByLongitude;
        }
        return options.orderByLongitude === 1 ? a.long - b.long : b.long - a.long;
      });
    }
    if (options && options.orderByCategoryDisplayValue) {
      obj.sort(function (a, b) {
        if (a.categoryDisplayValue < b.categoryDisplayValue) {
          return -1 * options.orderByCategoryDisplayValue;
        }
        if (a.categoryDisplayValue > b.categoryDisplayValue) {
          return options.orderByCategoryDisplayValue;
        }
        return 0;
      });
    }
    if (options && options.orderByNeighborhoodsDisplayValue) {
      obj.sort(function (a, b) {
        if (a.neighborhoodsDisplayValue < b.neighborhoodsDisplayValue) {
          return -1 * options.orderByNeighborhoodsDisplayValue;
        }
        if (a.neighborhoodsDisplayValue > b.neighborhoodsDisplayValue) {
          return options.orderByNeighborhoodsDisplayValue;
        }
        return 0;
      });
    }
  } else {
    objToDTO(obj);
  }
};
exports.transformToBusinessDTO = transformToBusinessDTO;

var businessImages = function (db) {
  return db.collection(COLL_BUSSINESS_IMAGES);
};

var isValidBusiness = function (obj, isIDRequired) {
  if (obj) {
    if (isIDRequired && !obj.hasOwnProperty('_id')) {
      console.log("business is not valid because _id is required");
      return false;
    }
    return obj.hasOwnProperty('name'); /*&& obj.hasOwnProperty('loc') && obj.loc.hasOwnProperty('coordinates')*/
  }
  return false;
};

var stripNonDigits = function (str) {
  if (str) {
    return (String(str)).replace(/\D/g,'');
  }
  return str;
};

var setClassificationFieldsIfExist = function (req, business, classificationsMap) {
  var classification = null;
  if (!classificationsMap) {
    console.log("Warning -- no classification map exists.");
    return;
  }
  _.each(_.keys(req.body), function (key) {
    var id, matchResults;
    matchResults = key.match(/^class_(\w+)_(\w+)/);
    if (matchResults) {
      id = matchResults[1];
      console.log("   matched. matchResults: " + util.inspect(matchResults) + ", id is " + id);
      if (!classificationsMap.hasOwnProperty(id)) {
        return;
      }
      classification = classificationsMap[id];
      console.log("   and corresponding classification is " + util.inspect(classification));
      if (classification.dataType === 'boolean') {
        RequestUtils.setFieldAsBooleanIfExists(key, req, business);
      } else if (classification.dataType === 'string') {
        RequestUtils.setFieldIfExists(key, req, business);
      } else if (classification.dataType === 'integer') {
        RequestUtils.setFieldAsIntIfExists(key, req, business);
      } else if (classification.dataType === 'float') {
        RequestUtils.setFieldAsFloatIfExists(key, req, business);
      } else if (classification.dataType === 'list' || _.isUndefined(classification.dataType)) {
        console.log("    type is list");
        RequestUtils.setFieldIfExists(key, req, business);
      }
    }
  });
};



var getValidClassificationIdsMap = function (classificationsMap) {
  if (!classificationsMap) {
    return;
  }
  var validExpandedCategoryIdsMap = {}
    , c1Id, c2Id, c3Id;
  _.each(classificationsMap, function (c1) {
    c1Id = c1._id.toString();
    validExpandedCategoryIdsMap[c1Id] = true;
    if (c1.hasOwnProperty('types')) {
      _.each(c1.types, function (c2) {
        c2Id = c1Id + ':' + c2.id;
        validExpandedCategoryIdsMap[c2Id] = true;
        if (c2.hasOwnProperty('subtypes')) {
          _.each(c2.subtypes, function (c3) {
            c3Id = c2Id + ':' + c3.id;
            validExpandedCategoryIdsMap[c3Id] = true;
          });
        }
      });
    }
  });
  return validExpandedCategoryIdsMap;
};


/**
 * factory method to create POJSO from request object
 */
var businessFromRequest = function (req, classificationsMap) {
  if (req) {
    var business = {};
    if (req.params.id) {
      business._id = req.params.id;
    }
    if (req.body.hasOwnProperty('loc') && req.body.loc.hasOwnProperty('coordinates') && req.body.loc.coordinates.length === 2) {
      business.loc = {'type': 'Point', 'coordinates': [parseFloat(req.body.loc.coordinates[0]) || null, parseFloat(req.body.loc.coordinates[1]) || null]};
    } else if (req.body.hasOwnProperty('long') && req.body.hasOwnProperty('lat')) {
      business.loc = {'type': 'Point', 'coordinates': [parseFloat(req.body.long) || null, parseFloat(req.body.lat) || null]};
    }
    RequestUtils.setFieldsIfExist([
      'name',
      'altName',
      'addr1',
      'addr2',
      'beaconIds', // array
      'categoryIds',  // array of classifications
      'categoryTypeIds',  // array of classifications
      'categorySubTypeIds', // array of classifications
      'city',
      'costDesc',
      'description1',
      'description2',
      'import_src',
      'imported_data',
      'insuranceIds', // array of classifications
      'menuUrl',
      'neighborhoods',
      'neighborhoodGeoIds', // array of ids
      'openingHours',
      'paymentMobileUrl',
      'place_id', // google places id
      'phone',
      'primaryImageId',
      'reservationUrl',
      'reservationUrlMobile',
      'search',
      'state',
      'urlFacebook',
      'urlFoursquare',
      'urlTwitter',
      'urlYelp',
      'website',
      'zip'
    ], req, business);
    RequestUtils.setFieldsAsFloatIfExist(['rating', 'rating_google', 'rating_yelp', 'rating_foursquare'], req, business);
    RequestUtils.setFieldsAsBooleanIfExist([
      'acceptsReservations',
      'catering',
      'delivery',
      'featured',
      'menu',
      'outdoorSeating',
      'published',
      'takeout',
      'tv',
      'wifi'
    ], req, business);
    RequestUtils.setFieldsAsIntIfExist(['priceRange'], req, business);
    pruneInvalidCategoryValues(business, getValidClassificationIdsMap(classificationsMap));
    setClassificationFieldsIfExist(req, business, classificationsMap);

    business.neighborhoodsDisplayValue = formatNeighborhoodsList(business.neighborhoods);

    if (business.phone) {
      business.phone = stripNonDigits(business.phone);
    }

    // ToDo: nearby transit (from MTA feed, based on lat/long)
    // ToDo: hours - 7 element array w/ open/close times
    // ToDo: geofence

    return business;
  }
  return null;
};


/**
 *
 * @param imagePropertyString -- a pipe-delimited string of the format:  URL|width|height
 * @returns {{url: ..., secureUrl: ..., width: ..., height: ...}}
 */
var parseDefaultImageProperty = function (imagePropertyString) {
  var img = {
    url: null,
    secureUrl: null,
    width: null,
    height: null
  }, splitStr;
  if (imagePropertyString && imagePropertyString.indexOf("http") === 0 && imagePropertyString.split('|').length === 3) {
    splitStr = imagePropertyString.split('|');
    img.url = splitStr[0];
    img.secureUrl = splitStr[0].indexOf("https") === 0 ? splitStr[0] : splitStr[0].replace("http://", "https://");
    img.width = parseInt(splitStr[1], 10);
    img.height = parseInt(splitStr[2], 10);
  } else {
    console.log("Warning:  imagePropertyString is not of the right format.  " + imagePropertyString);
  }
  return img;
};

var createSystemDefaultImageObject = function (businessId, url, secureUrl, width, height, name, description) {
  return {
    businessId: businessId,
    format: url.split('.').pop().toLowerCase(),
    resource_type: 'image',
    created_at: new Date(),
    url: url,
    secureUrl: secureUrl,
    width: width,
    height: height,
    name: name || 'Default',
    description: description || 'Default image for POI',
    is_system_default: true
  };
};

var getDefaultEatImage = function (businessId) {
  var parsedImgInfo = parseDefaultImageProperty(process.env.DEFAULT_EAT_IMAGE_INFO);
  return createSystemDefaultImageObject(businessId, parsedImgInfo.url, parsedImgInfo.secureUrl, parsedImgInfo.width,
    parsedImgInfo.height, 'Eat', 'Eat');
};

var getDefaultMoveImage = function (businessId) {
  var parsedImgInfo = parseDefaultImageProperty(process.env.DEFAULT_MOVE_IMAGE_INFO);
  return createSystemDefaultImageObject(businessId, parsedImgInfo.url, parsedImgInfo.secureUrl, parsedImgInfo.width,
    parsedImgInfo.height, 'Move', 'Move');
};

var getDefaultHealImage = function (businessId) {
  var parsedImgInfo = parseDefaultImageProperty(process.env.DEFAULT_HEAL_IMAGE_INFO);
  return createSystemDefaultImageObject(businessId, parsedImgInfo.url, parsedImgInfo.secureUrl, parsedImgInfo.width,
    parsedImgInfo.height, 'Heal', 'Heal');
};

/*
var addDefaultImageToBusiness = function (db, businessId, callback) {
  console.log("addDefaultImageToBusiness(...), businessId: " + businessId);
  var defaultImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg",
    defaultImageSecureURL = "https://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg",
    defaultImageWidth = 640,
    defaultImageHeight = 360,
    defaultImage = {
      businessId: businessId,
      format: 'jpg',
      resource_type: 'image',
      created_at: new Date(),
      url: process.env.DEFAULT_POI_IMAGE || defaultImageURL,
      secureUrl: process.env.DEFAULT_POI_IMAGE_SECURE || defaultImageSecureURL,
      width: process.env.DEFAULT_POI_IMAGE_WIDTH || defaultImageWidth,
      height: process.env.DEFAULT_POI_IMAGE_HEIGHT || defaultImageHeight,
      name: 'Default',
      description: 'Default image for POI',
      is_system_default: true
    };

  businessImagesDAO.addImage(db, defaultImage, function (err) {
    if (err) {
      callback("Error inserting default image data into database for business. " + err, null);
    } else {
      console.log("Default POI image was added to the database.");
      callback(null, defaultImage);
    }
  });
};
*/

var addOrRemoveDefaultImageToBusinessAsNeeded = function (db, businessId, categoryIds, callback) {
  console.log(util.format("addOrRemoveDefaultImageToBusinessAsNeeded() -- businessId: '%s', categoryIds: '%j'", businessId, categoryIds));

  var eatId = process.env.CATEGORY_EAT_ID,
    moveId = process.env.CATEGORY_MOVE_ID,
    healId = process.env.CATEGORY_HEAL_ID,
    errorMsg = null,
    image = null;

  if (!eatId || !moveId || !healId) {
    errorMsg = "Warning:  No config var was set for one or more of: CATEGORY_EAT_ID, CATEGORY_MOVE_ID, CATEGORY_HEAL_ID";
    console.log(errorMsg);
    callback(errorMsg);
  }
  businessImagesDAO.getBusinessImages(db, businessId, function (err, imageList) {
    if (err) {
      return callback(err);
    }
    var hasCustomImages = imageList && _.any(imageList, function (val) { return val.is_system_default; }),
      hasDefaultImages = imageList && _.any(imageList, function (val) { return !val.is_system_default; });
    if (hasCustomImages) {
      if (hasDefaultImages) {
        // this is an invalid state.  the default images need to be removed.
        businessImagesDAO.deleteSystemDefaultImageFromBusiness(db, businessId, function (delErr) {
          if (delErr) {
            console.log("error deleting system default image from POI that already has custom images. " + util.inspect(delErr));
          }
        });
      }
      // I don't really care if the delete operation failed.
      return callback(null);
    }

    // no custom images exist
    if (!hasDefaultImages) {
      if (categoryIds) {
        if (_.contains(categoryIds, eatId)) {
          console.log("Attempting to add default image for 'Eat' to businessId " + businessId);
          image = getDefaultEatImage(businessId);
        } else if (_.contains(categoryIds, moveId)) {
          console.log("Attempting to add default image for 'Move' to businessId " + businessId);
          image = getDefaultMoveImage(businessId);
        } else if (_.contains(categoryIds, healId)) {
          console.log("Attempting to add default image for 'Heal' to businessId " + businessId);
          image = getDefaultHealImage(businessId);
        }
      }
      if (image) {
        businessImagesDAO.addImage(db, image, function (addImgErr, imageData) {
          if (addImgErr) {
            var errMsg = "error adding default image to business. %s" + addImgErr;
            console.log(errMsg);
            return callback(errMsg);
          }
          console.log("successfully added default image.  Result: " + util.inspect(imageData));

          // set this image as the primary image for the business
          businessDAO.setPrimaryImage(db, businessId, imageData._id, callback);
        });
      }
    }
    return callback(null);
  });
};

/**
 * helper function that will set the value of the 'published' field on a mongo query object
 * @param query the mongo query object
 * @param req the request, used to extract security info about the user's role
 */
function setPublishedValueOnQuery(query, req) {
  var pubFlagVal = RequestUtils.getFieldIfExists('published', req);
  if (SecurityUtils.canViewPublishedFlag(req) && pubFlagVal) {
    if (_.isUndefined(pubFlagVal) || pubFlagVal === null || pubFlagVal === 'null') {
      query.published = true;
    } else if (pubFlagVal !== 'all') {
      RequestUtils.buildQueryObjectForBooleans(query, ['published'], req);
    }
  } else {
    query.published = true;
  }
}

var augmentBusinessQueryToRequireNonBlankValues = function (query) {
  if (!query.name) {
    query.name = { $exists: true, $ne: ''};
  }
  query['loc.coordinates'] = { $exists: true, $size: 2 };
  if (!query.city) {
    query.city = { $exists: true, $ne: ''};
  }
  if (!query.state) {
    query.state = { $exists: true, $ne: '' };
  }
  if (!query.categoryIds) {
    query.categoryIds = { $exists: true, $not: { $size: 0 } };
  }
};

exports.findBusinesses = function (db) {
  return function (req, res) {
    var query = {},
      tmpQuery = {},
      geo = {},
      searchOptions = {},
      pageSize = parseInt(RequestUtils.getFieldIfExists('pageSize', req), 10),
      pageNumber = parseInt(RequestUtils.getFieldIfExists('pageNumber', req), 10),
      sortExpression = {},
      orderByValue = RequestUtils.getFieldIfExists('orderBy', req),
      isPortal = RequestUtils.getBooleanFieldIfExists('isPortal', req),
      shouldIncludeImageStats = RequestUtils.getBooleanFieldIfExists('includeImageStats', req),
      shouldIncludeSubCatCount = RequestUtils.getBooleanFieldIfExists('includeSubCatCount', req),
      dtoOpts = {isPortal: isPortal, shouldIncludeSubCatCount: shouldIncludeSubCatCount},
      search = RequestUtils.getFieldIfExists('search', req),
      conditionId = RequestUtils.getFieldIfExists('conditionId', req),
      procedureId = RequestUtils.getFieldIfExists('procedureId', req);
    RequestUtils.buildSortExpression(sortExpression, req);
    if (orderByValue && orderByValue.indexOf('long') >= 0) {
      dtoOpts.orderByLongitude = RequestUtils.getMongoSortDirectionFromOrderDir(req);
      delete sortExpression.long;
    } else if (orderByValue && orderByValue.indexOf('nonDefaultImageCount') >= 0) {
      dtoOpts.orderByNonDefaultImageCount = RequestUtils.getMongoSortDirectionFromOrderDir(req);
      delete sortExpression.nonDefaultImageCount;
    } else if (orderByValue && orderByValue.indexOf('subCatCount') >= 0) {
      dtoOpts.orderBySubCatCount = RequestUtils.getMongoSortDirectionFromOrderDir(req);
      delete sortExpression.subCatCount;
    } else if (orderByValue && orderByValue.indexOf('categoryDisplayValue') >= 0) {
      dtoOpts.orderByCategoryDisplayValue = RequestUtils.getMongoSortDirectionFromOrderDir(req);
      delete sortExpression.categoryDisplayValue;
    } else if (orderByValue && orderByValue.indexOf('neighborhoodsDisplayValue') >= 0) {
      dtoOpts.orderByNeighborhoodsDisplayValue = RequestUtils.getMongoSortDirectionFromOrderDir(req);
      delete sortExpression.neighborhoodsDisplayValue;
    }
    if (_.isEmpty(sortExpression)) {
      sortExpression = {name: 1};
    }

    if (SecurityUtils.hasOnlyRole(req, Roles.BUSINESS_ADMIN)) {
      query._id = { $in: _.map(req.user.customData.businessIds, function (bid) { return new ObjectID(bid); }) };
    }
    RequestUtils.setFieldsIfExist(['long', 'lat', 'maxDistance'], req, geo);
    if (geo.long && geo.lat) {
      RequestUtils.buildQueryObjectForGeospatialNear(query, 'loc', geo.long, geo.lat, geo.maxDistance);
      if (pageSize) {
        if (pageSize > MAX_RESULTS_FOR_GEO_QUERY) {
          pageSize = MAX_RESULTS_FOR_GEO_QUERY;
        }
      } else {
        pageSize = MAX_RESULTS_FOR_GEO_QUERY;
      }
    }
    setPublishedValueOnQuery(query, req);
    RequestUtils.buildQueryObjectForStrings(tmpQuery, ['neighborhood', 'city', 'state'], req);
    if (_.has(tmpQuery, 'neighborhood')) {
      query.neighborhoods = tmpQuery.neighborhood;
    }
    _.extend(query, _.omit(tmpQuery, 'neighborhood'));
    RequestUtils.buildQueryObjectForArrayOfStrings(query, ['neighborhoodGeoIds'], req);
    RequestUtils.buildQueryObjectForBooleans(query, ['featured'], req);
    RequestUtils.buildQueryObjectForCategoryHierarchy(query, req);
    RequestUtils.buildQueryObjectForRegexes(query, ['name'], req);
    if (!isPortal) {
      augmentBusinessQueryToRequireNonBlankValues(query);
    }
    if (search) {
      RequestUtils.buildQueryObjectForRegexes(query, ['search'], req);
      query.name = query.search;
      delete query.search;
    }
    if (conditionId) {
      query.conditionData = { $elemMatch: { id: conditionId, published: true} };
    }
    if (procedureId) {
      query.procedureData = { $elemMatch: { id: procedureId, published: true} };
    }
    if (pageSize > 0) {
      searchOptions.limit = pageSize;
      if (pageNumber > 0) {
        searchOptions.skip = (pageNumber - 1) * pageSize;
      }
    }
    searchOptions.sort = sortExpression;
    RequestUtils.logRequestParams(req, 'findBusinesses()');
    console.log("searchOptions is: " + JSON.stringify(searchOptions));
    console.log("findBusinesses() - constructed query object: " + JSON.stringify(query));
    console.log("findBusinesses() - searchOptions: " + JSON.stringify(searchOptions));

    businesses(db).findItems(query, searchOptions, function (err, items) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding businesses. " + err);
      } else {
        classificationsDAO.findAll(db, function (error, allCategories) {
          if (error) {
            RequestUtils.errorResponse(res, "Error fetching category info prior to transforming businesses results to DTOs. " + error);
            return;
          }
          dtoOpts.classificationsMap = classificationsDAO.buildClassificationsMap(allCategories);
          if (shouldIncludeImageStats) {
            businessImagesDAO.getNonDefaultImageCountForBusinesses(db, function (gndicfbErr, imgData) {
              if (gndicfbErr) {
                RequestUtils.errorResponse(res, "Error getting image stats info. " + gndicfbErr);
                return;
              }
              var imgDataMap = _.indexBy(imgData, '_id')
                , entry = null
                , count = 0;
              if (!_.isEmpty(imgDataMap)) {
                items.forEach(function (item) {
                  entry = imgDataMap[item._id.toString()];
                  count = entry && entry.count > 0 ? entry.count : 0;
                  item.nonDefaultImageCount = count;
                });
              }
              transformToBusinessDTO(items, req, dtoOpts);
              res.json(items);
            });
          } else {
            transformToBusinessDTO(items, req, dtoOpts);
            res.json(items);
          }
        });
      }
    });
  };
};

/**
 * Use this for getting a list of all published businesses where the schema is very minimal,
 * i.e. only the most important fields are returned like 'name', 'addr1', etc.
 */
exports.findBusinessesMinimal = function (db) {
  return function (req, res) {
    if (RequestUtils.unauthenticatedErrorResponseIfNotLoggedIn(req, res)) {
      return;
    }
    businessDAO.findBusinessesMinimal(db, function (err, businesses) {
      if (err) {
        RequestUtils.errorResponse(res, "Error retrieving businesses (minimal version)");
        return;
      }
      _.each(businesses, function (business) {
        business.displayName = (business.name + ' - ' + (business.addr1 || '') + ', ' + business.city + ', ' + business.state).trim();
        JSONResponseUtils.replaceIdField(business);
        delete business.name;
        delete business.addr1;
        delete business.city;
        delete business.state;
        delete business.zip;
      });
      res.json(businesses);
    });
  };
};


exports.getBusiness = function (db) {
  return function (req, res) {
    var id = req.params.id,
      includeImportedDetails = RequestUtils.getBooleanFieldIfExists('includeImportedDetails', req),
      options = {includeImportedDetails: includeImportedDetails};
    console.log("get business with id of " + id);
    businessDAO.findBusinessById(db, id, function (err, item) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding business with id of " + id);
      } else {
        classificationsDAO.findAll(db, function (error, allCategories) {
          if (error) {
            RequestUtils.errorResponse(res, "Error fetching category info prior to transforming businesses results to DTOs. " + error);
            return;
          }
          options.classificationsMap = classificationsDAO.buildClassificationsMap(allCategories);
          transformToBusinessDTO(item, req, options);
          res.json(item);
        });
      }
    });
  };
};

var addNeighborhoodIfNeeded = function (db, business) {
  if (business && business.city && business.state && !_.isEmpty(business.neighborhoods)) {
    _.each(business.neighborhoods, function (val) {
      if (val !== GLOBAL_PENDING_NEIGHBORHOOD_NAME) {
        neighborhoodDAO.addNeighborhoodToCityState(db, business.city, business.state, val, function (err) {
          if (err) {
            console.log("error adding neighborhood as part of add/update to business. " + err);
          } else {
            console.log("added neighborhood '" + val + "' (if necessary) to " + business.city + ", " + business.state);
          }
        });
      }
    });
  }
};



exports.addBusiness = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, 'addBusiness()');

    classificationsDAO.fetchAndBuildClassificationsMap(db, function (err, classificationsMap) {
      if (err) {
        RequestUtils.errorResponse(res, "Error fetching and building classifications map.");
        return;
      }
      var business = businessFromRequest(req, classificationsMap);
      console.log("add business: " + JSON.stringify(business));
      if (!isValidBusiness(business)) {
        RequestUtils.errorResponse(res, "Bad/missing properties for business");
        return;
      }
      business.createdAt = new Date();
      if (_.isEmpty(business.neighborhoodGeoIds)) {
        business.neighborhoodGeoIds = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
        business.neighborhoods = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
        business.neighborhoodDisplayValue = GLOBAL_PENDING_NEIGHBORHOOD_NAME;
      } else {
        addNeighborhoodIfNeeded(db, business);
      }
      business.categoryIds = _.uniq(business.categoryIds || []);
      businesses(db).insert(business, function (err, result) {
        if (err) {
          RequestUtils.errorResponse(res, "Error inserting new business. " + err);
        } else {
          transformToBusinessDTO(result, req);
          var businessId = result[0].id.toString();
          console.log("New business created: " + util.inspect(result));
          console.log("businessId: " + businessId);
          /*
          addDefaultImageToBusiness(db, businessId, function (error) {
            if (error) {
              RequestUtils.errorResponse(res, "Error adding default image to a newly added business. " + err);
            } else {
              (business.neighborhoodGeoIds || []).forEach(function (ngId) {
                neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, ngId, function (err) {
                  if (err) {
                    console.log("error updating poiCount for neighborhoodGeoId " + ngId + ". " + err);
                  }
                });
              });
              res.json(201, result);
            }
          });
          */
          addOrRemoveDefaultImageToBusinessAsNeeded(db, businessId, business.categoryIds, function (defImgErr, defImgData) {
            if (defImgErr) {
              RequestUtils.errorResponse(res, "Error adding default image to a newly added business. " + defImgErr);
            } else {
              console.log("new default image added to POI. " + util.inspect(defImgData));
              (business.neighborhoodGeoIds || []).forEach(function (ngId) {
                neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, ngId, function (poiCountErr) {
                  if (poiCountErr) {
                    console.log("error updating poiCount for neighborhoodGeoId " + ngId + ". " + util.inspect(poiCountErr));
                  }
                });
              });
              res.json(201, result);
            }
          });
        }
      });
    });
  };
};


/**
 * returns the new array, cleansed of (PENDING), but only if it's not the only neighborhood
 * @param neighborhoods an array of neighborhoods
 */
var cleansePendingNeighborhoodFromNeighborhoodArray = function (neighborhoods) {
  console.log('cleansePendingNeighborhoodFromNeighborhoodArray -- will remove ' + GLOBAL_PENDING_NEIGHBORHOOD_NAME);
  if (_.isArray(neighborhoods) && neighborhoods.length > 1 && _.contains(neighborhoods, GLOBAL_PENDING_NEIGHBORHOOD_NAME)) {
    return _.select(neighborhoods, function (v) {
      return v !== GLOBAL_PENDING_NEIGHBORHOOD_NAME;
    });
  }
  return neighborhoods;
};

/**
 * returns void.  Modifies the business.neighborhoods array to remove (PENDING) if necessary
 * @param business
 */
var cleansePendingNeighborhoodFromBusiness = function (business) {
  business.neighborhoods = cleansePendingNeighborhoodFromNeighborhoodArray(business.neighborhoods);
  business.neighborhoodGeoIds = cleansePendingNeighborhoodFromNeighborhoodArray(business.neighborhoodGeoIds);
};

var addPendingNeighborhoodToBusinessIfNeeded = function (business) {
  if (!business) {
    return;
  }
  if (!business.neighborhoodGeoIds || business.neighborhoodGeoIds.length === 0) {
    business.neighborhoodGeoIds = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
    business.neighborhoods = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
    business.neighborhoodsDisplayValue = formatNeighborhoodsList(business);
  }
};


exports.editBusiness = function (db) {
  return function (req, res) {
    RequestUtils.logRequestParams(req, 'editBusiness');
    var id = req.params.id;
    console.log("edit business with id of " + id);
    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }
    if (!SecurityUtils.canEditBusiness(req, id)) {
      RequestUtils.forbiddenResponse(res, "You do not have permission to edit this business.");
      return;
    }
    classificationsDAO.fetchAndBuildClassificationsMap(db, function (fabcmErr, classificationsMap) {

      if (fabcmErr) {
        RequestUtils.errorResponse(res, "Error fetching and building classifications map.");
        return;
      }

      businessDAO.findBusinessById(db, id, function (fbidErr, originalBusiness) {
        var business, neighGeoIdsToUpdate;
        if (fbidErr) {
          RequestUtils.errorResponse(res, "Error fetching original business with id of " + id);
          return;
        }

        business = businessFromRequest(req, classificationsMap);
        if (!isValidBusiness(business, true)) {
          RequestUtils.errorResponse(res, "Bad/missing properties for business");
          return;
        }
        neighGeoIdsToUpdate = _.reject(_.compact(_.union(originalBusiness.neighborhoodGeoIds || [], business.neighborhoodGeoIds || [])), function (val) {
          return val === GLOBAL_PENDING_NEIGHBORHOOD_NAME;
        });
        delete business._id;
        business.categoryIds = _.uniq(business.categoryIds || []);
        cleansePendingNeighborhoodFromBusiness(business);
        addNeighborhoodIfNeeded(db, business);
        addPendingNeighborhoodToBusinessIfNeeded(business);
        business.updatedAt = new Date();
        delete business.id;
        businesses(db).update(daoUtils.getIdQuery(id), {$set: business}, {safe: true, multi: false}, function (busUpdateErr, result) {
          if (busUpdateErr) {
            RequestUtils.errorResponse(res, "Error editing business. " + busUpdateErr);
            return;
          }
          if (!result) {
            RequestUtils.errorResponse(res, "Error saving changes to business.  Make sure all fields are valid.");
            return;
          }

          addOrRemoveDefaultImageToBusinessAsNeeded(db, id, business.categoryIds, function (defImgErr) {
            if (defImgErr) {
              RequestUtils.errorResponse(res, "Error adding default image to a newly added business. " + defImgErr);
            } else {
              var neighUpdateOps = [];
              neighGeoIdsToUpdate.forEach(function (ngId) {
                (function (neGeId) {
                  neighUpdateOps.push(function (cb) {
                    neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, neGeId, function (poiCountErr) {
                      if (poiCountErr) {
                        var errMsg = "error updating the POI count for neighborhoodGeoId " + neGeId + ". " + util.inspect(poiCountErr);
                        console.log(errMsg);
                        cb(errMsg);
                      } else {
                        cb();
                      }
                    });
                  });
                }(ngId));
              });
              if (neighUpdateOps.length > 0) {
                async.series(neighUpdateOps, function (errSeries) {
                  if (errSeries) {
                    RequestUtils.errorResponse(res, "Error updating neighborhood POI count as part of updating business. " + util.inspect(errSeries));
                  } else {
                    console.log("successfully saved changes to business " + id);
                    res.json(200, null);
                  }
                });
              } else {
                res.json(200, null);
              }
            }
          });
        });
      });
    });
  };
};


exports.setConditionsOnBusiness = function (db) {
  return function (req, res) {
    var id = req.params.id,
      conditionData = RequestUtils.getFieldIfExists("conditionData", req);

    console.log("setting conditions on a business with id of " + id);
    console.log("conditionData is: " + JSON.stringify(conditionData, null, 3));
    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }

    if (conditionData) {
      _.each(conditionData, function (val) {
        val.providerPrice = parseFloat(val.providerPrice);
      });
    }

    businesses(db).update(RequestUtils.getIdQuery(id), {$set: {conditionData: conditionData, updatedAt: new Date()}}, {safe: true, multi: false}, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error editing business. " + err);
      } else {
        console.log("successfully saved changes to business " + id + ". result: " + result);
        res.json(200, null);
      }
    });
  };
};


exports.setProceduresOnBusiness = function (db) {
  return function (req, res) {
    var id = req.params.id,
      procedureData = RequestUtils.getFieldIfExists("procedureData", req);

    console.log("setting procedures on a business with id of " + id);
    console.log("conditionData is: " + JSON.stringify(procedureData, null, 3));

    if (!id) {
      RequestUtils.errorResponse(res, "No id was specified");
      return;
    }

    if (procedureData) {
      _.each(procedureData, function (val) {
        val.providerPrice = parseFloat(val.providerPrice);
      });
    }

    businesses(db).update(RequestUtils.getIdQuery(id), {$set: {procedureData: procedureData, updatedAt: new Date()}}, {safe: true, multi: false}, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error editing business. " + err);
      } else {
        console.log("successfully saved changes to business " + id + ". result: " + result);
        res.json(200, null);
      }
    });
  };
};


exports.deleteBusiness = function (db) {
  return function (req, res) {
    var id = req.params.id;
    console.log("delete business with id of " + id);

    businessDAO.findBusinessById(db, id, function (err1, originalBusiness) {
      if (err1) {
        RequestUtils.errorResponse(res, "Error fetching original business with id of " + id + ". " + util.inspect(err1));
        return;
      }
      businesses(db).removeById(id, function (err2) {
        if (err2) {
          RequestUtils.errorResponse(res, "Error deleting business. " + util.inspect(err2));
        } else {
          // ToDo: delete business images
          (_.compact(originalBusiness.neighborhoodGeoIds) || []).forEach(function (ngId) {
            neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, ngId, function (poiCountErr) {
              if (poiCountErr) {
                console.log("error updating the POI count for neighborhoodGeoId " + ngId + ". " + util.inspect(poiCountErr));
              }
            });
          });
          res.json(204, null);
        }
      });
    });
  };
};


exports.countBusinesses = function (db) {
  return function (req, res) {
    var query = {},
      geo = {},
      tmpQuery = {},
      search = RequestUtils.getFieldIfExists('search', req),
      isPortal = RequestUtils.getBooleanFieldIfExists('isPortal', req),
      conditionId = RequestUtils.getFieldIfExists('conditionId', req),
      procedureId = RequestUtils.getFieldIfExists('procedureId', req);
    RequestUtils.logRequestParams(req, 'countBusinesses()');
    if (SecurityUtils.hasOnlyRole(req, Roles.BUSINESS_ADMIN)) {
      query._id = { $in: _.map(req.user.customData.businessIds, function (bid) { return new ObjectID(bid); }) };
    }
    RequestUtils.setFieldsIfExist(['long', 'lat', 'maxDistance'], req, geo);
    if (geo.long && geo.lat) {
      RequestUtils.buildQueryObjectForGeospatialNear(query, 'loc', geo.long, geo.lat, geo.maxDistance);
    }
    setPublishedValueOnQuery(query, req);
    RequestUtils.buildQueryObjectForStrings(tmpQuery, ['neighborhood', 'city', 'state'], req);
    if (_.has(tmpQuery, 'neighborhood')) {
      query.neighborhoods = tmpQuery.neighborhood;
    }
    _.extend(query, _.omit(tmpQuery, 'neighborhood'));
    RequestUtils.buildQueryObjectForBooleans(query, ['featured'], req);
    RequestUtils.buildQueryObjectForCategoryHierarchy(query, req);
    RequestUtils.buildQueryObjectForRegexes(query, ['name'], req);
    if (!isPortal) {
      augmentBusinessQueryToRequireNonBlankValues(query);
    }
    if (search) {
      RequestUtils.buildQueryObjectForRegexes(query, ['search'], req);
      query.name = query.search;
      delete query.search;
    }
    if (conditionId) {
      query.conditionData = { $elemMatch: { id: conditionId, published: true} };
    }
    if (procedureId) {
      query.procedureData = { $elemMatch: { id: procedureId, published: true} };
    }
    businesses(db).count(query, function (err, value) {
      if (err) {
        RequestUtils.errorResponse(res, "Error counting businesses. " + err);
      } else {
        res.json(value);
      }
    });
  };
};

exports.setNeighborhoodsForBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.id,
      neighborhoods = RequestUtils.getFieldIfExists('neighborhoods', req),
      neighborhoodGeoIds = RequestUtils.getFieldIfExists('neighborhoodGeoIds', req),
      updateOp,
      queryOptions = {safe: true, multi: false},
      idQuery = daoUtils.getIdQuery(businessId);
    RequestUtils.logRequestParams(req, 'setNeighborhoodsForBusiness');
    if (_.isUndefined(neighborhoods) || _.isNull(neighborhoods)) {
      RequestUtils.errorResponse(res, "the 'neighborhoods' parameter is required");
      return;
    }
    if (_.isString(neighborhoods)) {
      neighborhoods = [neighborhoods];
    }
    if (!_.isArray(neighborhoods)) {
      RequestUtils.errorResponse(res, "the 'neighborhoods' parameter was not an array of strings");
      return;
    }

    businessDAO.findBusinessById(db, businessId, function (err1, originalBusiness) {
      if (err1) {
        RequestUtils.errorResponse(res, "Error fetching original business with id of " + businessId + ". " + util.inspect(err1));
        return;
      }

      neighborhoods = cleansePendingNeighborhoodFromNeighborhoodArray(neighborhoods.sort());
      neighborhoodGeoIds = cleansePendingNeighborhoodFromNeighborhoodArray(neighborhoodGeoIds);
      if (neighborhoodGeoIds.length === 0) {
        neighborhoodGeoIds = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
        neighborhoods = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
      }
      if (neighborhoods.length === 0) {
        neighborhoods = [GLOBAL_PENDING_NEIGHBORHOOD_NAME];
      }

      updateOp = {$set: {'neighborhoods': neighborhoods,
        'neighborhoodsDisplayValue': formatNeighborhoodsList(neighborhoods),
        'neighborhoodGeoIds': neighborhoodGeoIds,
        updatedAt: new Date()}};
      businesses(db).update(idQuery, updateOp, queryOptions, function (err2, result) {
        if (err2) {
          RequestUtils.errorResponse(res, "Error updating neighborhoods for business. " + util.inspect(err2));
        } else {
          var ngIds = _.compact(_.union(neighborhoodGeoIds, originalBusiness.neighborhoodGeoIds));
          ngIds.forEach(function (ngId) {
            neighborhoodGeoDAO.calculateAndSetPOICountForNeighborhoodGeo(db, ngId, function (poiCountErr) {
              if (poiCountErr) {
                console.log("error updating the POI count for neighborhoodGeoId " + ngId + ". " + util.inspect(poiCountErr));
              }
            });
          });
          console.log("successfully updated neighborhoods for business " + businessId + ". result: " + result);
          res.json(200, null);
        }
      });
    });

  };
};

exports.addCategoryToBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.id,
      categoryId = req.params.catId,
      categoryTypeId = req.params.catTypeId,
      categorySubTypeId = req.params.catSubTypeId,
      idQuery = daoUtils.getIdQuery(businessId),
      catIdToPush = null,
      catTypeIdToPush = null,
      catSubTypeIdToPush = null,
      updateFunctions = [];
    console.log("adding catId/catTypeId/catSubTypeId of " + categoryId + " / " + categoryTypeId + " / " + categorySubTypeId + " to business with id of " + businessId);

    if (categoryId) {
      catIdToPush = categoryId;
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$addToSet: {categoryIds: catIdToPush}}, function (err) {
          callback(err, null);
        });
      });
    }
    if (categoryId && categoryTypeId) {
      catTypeIdToPush = catIdToPush + ':' + categoryTypeId;
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$addToSet: {categoryTypeIds: catTypeIdToPush}}, function (err) {
          callback(err, null);
        });
      });
    }
    if (categoryId && categoryTypeId && categorySubTypeId) {
      catSubTypeIdToPush = catTypeIdToPush + ':' + categorySubTypeId;
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$addToSet: {categorySubTypeIds: catSubTypeIdToPush}}, function (err) {
          callback(err, null);
        });
      });
    }
    if (updateFunctions.length === 0) {
      return RequestUtils.errorResponse(res, "No category information was specified for this add operation.");
    }

    updateFunctions.push(function (callback) {
      businessDAO.updateUpdatedAtField(db, businessId, callback);
    });

    businessDAO.findBusinessById(db, businessId, function (err, business) {
      if (err) {
        return RequestUtils.errorResponse(res, util.format("Error fetching business with id %s as part of operation to add category.", businessId));
      }
      updateFunctions.push(function (callback) {
        addOrRemoveDefaultImageToBusinessAsNeeded(db, businessId, business.categoryIds, callback);
      });
      async.series(updateFunctions, function (errSeries) {
        if (errSeries) {
          RequestUtils.errorResponse(res, "Error adding category to business. " + errSeries);
        } else {
          res.json(204, null);
        }
      });
    });
  };
};

exports.removeCategoryFromBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.id,
      categoryId = req.params.catId,
      categoryTypeId = req.params.catTypeId,
      categorySubTypeId = req.params.catSubTypeId,
      idQuery = daoUtils.getIdQuery(businessId),
      catTypeIdToPull = null,
      catSubTypeIdToPull = null,
      updateFunctions = [];
    console.log("remove catId/catTypeId/catSubTypeId of " + categoryId + " / " + categoryTypeId + " / " + categorySubTypeId + " from business with id of " + businessId);


    if (categoryId && categoryTypeId && categorySubTypeId) {
      catSubTypeIdToPull = categoryId + ':' + categoryTypeId + ':' + categorySubTypeId;
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categorySubTypeIds: catSubTypeIdToPull}}, function (err) {
          callback(err, null);
        });
      });
    } else if (categoryId && categoryTypeId) {
      catTypeIdToPull = categoryId + ':' + categoryTypeId;
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categoryTypeIds: catTypeIdToPull}}, function (err) {
          callback(err, null);
        });
      });
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categorySubTypeIds: new RegExp('^' + catTypeIdToPull + ':')}}, function (err) {
          callback(err, null);
        });
      });
    } else if (categoryId) {
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categoryIds: categoryId}}, function (err) {
          callback(err, null);
        });
      });
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categoryTypeIds: new RegExp('^' + categoryId + ':')}}, function (err) {
          callback(err, null);
        });
      });
      updateFunctions.push(function (callback) {
        businesses(db).update(idQuery, {$pull: {categorySubTypeIds: new RegExp('^' + categoryId + ':')}}, function (err) {
          callback(err, null);
        });
      });
    }

    if (updateFunctions.length === 0) {
      return RequestUtils.errorResponse(res, "No category information was specified for this delete operation.");
    }

    updateFunctions.push(function (callback) {
      businessDAO.updateUpdatedAtField(db, businessId, callback);
    });

    businessDAO.findBusinessById(db, businessId, function (err, business) {
      if (err) {
        return RequestUtils.errorResponse(res, util.format("Error fetching business with id %s as part of operation to remove category.", businessId));
      }
      updateFunctions.push(function (callback) {
        addOrRemoveDefaultImageToBusinessAsNeeded(db, businessId, business.categoryIds, callback);
      });
      async.series(updateFunctions, function (errSeries) {
        if (errSeries) {
          RequestUtils.errorResponse(res, "Error removing category from business. " + errSeries);
        } else {
          res.json(204, null);
        }
      });
    });
  };
};


exports.addBeaconToBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.id,
      beaconId = req.params.beaconId,
      idQuery = daoUtils.getIdQuery(businessId),
      updateOp = {};
    console.log("adding beacon with id of " + beaconId + " to business with id of " + businessId);
    updateOp.$push = {beacons: beaconId, updatedAt: new Date()};
    businesses(db).update(idQuery, updateOp, function (err) {
      if (err) {
        RequestUtils.errorResponse(res, "Error adding beacon to business. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};


exports.removeBeaconFromBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.id,
      beaconId = req.params.beaconId,
      idQuery = daoUtils.getIdQuery(businessId),
      updateOp = {};
    console.log("removing beacon with id of " + beaconId + " from business with id of " + businessId);
    updateOp.$pull = {beacons: beaconId, updatedAt: new Date()};
    businesses(db).update(idQuery, updateOp, function (err) {
      if (err) {
        RequestUtils.errorResponse(res, "Error removing beacon from business. " + err);
      } else {
        res.json(204, null);
      }
    });
  };
};



// fields : description, plus anything else
exports.addImageOfBusiness = function (db, formidable, cloudinary) {
  return function (req, res) {
    console.log("addImageOfBusiness()");
    var id = req.params.id,
      form = new formidable.IncomingForm();
    form.keepExtensions = true;
    form.encoding = 'utf-8';
    form.on('progress', function(bytesReceived, bytesExpected) {
      console.log(util.format("upload progress - %d / %d", bytesReceived, bytesExpected));
    });
    form.parse(req, function (err, fields, files) {
      if (err) {
        RequestUtils.errorResponse(res, "Error uploading image. " + err);
        return;
      }
      console.log('received fields: ' + util.inspect(fields));

      _.each(files, function (file) {
        cloudinary.uploader.upload(file.path, function (uploadResult) {
          console.log("File upload uploadResult:\n" + util.inspect(uploadResult));
          /*
          example uploadResult from website
           {
           public_id: 'cr4mxeqx5zb8rlakpfkg',
           version: 1372275963,
           signature: '63bfbca643baa9c86b7d2921d776628ac83a1b6e',
           width: 864,
           height: 576,
           format: 'jpg',
           resource_type: 'image',
           created_at: '2013-06-26T19:46:03Z',
           bytes: 120253,
           type: 'upload',
           url: 'http://res.cloudinary.com/demo/image/upload/v1372275963/cr4mxeqx5zb8rlakpfkg.jpg',
           secure_url: 'https://res.cloudinary.com/demo/image/upload/v1372275963/cr4mxeqx5zb8rlakpfkg.jpg'
           }
           */

          uploadResult.businessId = id;
          uploadResult.name = file.name;
          uploadResult.lastModifiedDate = file.lastModifiedDate;
          uploadResult.description = fields.description || '';
          uploadResult.created_at = new Date(uploadResult.created_at);
          // ToDo: fill in more metadata from fields

          console.log("adding image metadata to database: " + util.inspect(uploadResult));

          businessImages(db).insert(uploadResult, function (err, result) {
            if (err) {
              RequestUtils.errorResponse(res, "Error inserting image data into database. " + err);
            } else {
              console.log("New image was uploaded and added to the database.");
              businessImagesDAO.deleteSystemDefaultImageFromBusiness(db, id, function (err, data) {
                console.log(util.format("deleted system default image from business %s, if it exists. err: %s, data: %s", id, err, data));
              });
              businessDAO.updateUpdatedAtField(db, id, _.identity);
              res.json(201, result);
            }
          });
        });
      });
    });
  };
};


exports.removeImageFromBusiness = function (db, cloudinary) {
  return function (req, res) {
    var businessId = req.params.businessId,
      imageId = req.params.imageId;
    console.log(util.format("removeImageFromBusiness() - businessId: '%s', imageId: '%s'", businessId, imageId));

    businessImagesDAO.getImage(db, imageId, function (err, image) {
      if (err) {
        RequestUtils.errorResponse(res, "Error deleting image, because it could not be found. " + err);
        return;
      }

      businessImagesDAO.deleteImage(db, imageId, function (error) {
        if (error) {
          RequestUtils.errorResponse(res, "Error deleting image. " + error);
          return;
        }
        if (image.is_system_default) {
          console.log("Not deleting system default image (id=" + imageId + ") from cloudinary.");
        } else {
          var publicId = image.public_id;
          if (publicId) {
            cloudinary.api.delete_resources([publicId], function (deleteResult) {
              console.log("deleted image from cloudinary: " + util.inspect(deleteResult));
            });
          }

          businessDAO.findBusinessById(db, businessId, function (busErr, business) {
            if (!busErr) {
              addOrRemoveDefaultImageToBusinessAsNeeded(db, businessId, business.categoryIds, function (defImgErr) {
                if (defImgErr) {
                  console.log(util.format("Error updating default image (if necessary) for business '%s' after image deletion.  %s", businessId, defImgErr));
                }
              });
            }
          });
        }
        businessDAO.updateUpdatedAtField(db, businessId, _.identity);
        res.json(204, null);
      });

    });
  };
};



var transformToImageDTO = function (obj) {
  if (_.isUndefined(obj) || _.isNull(obj)) {
    return {};
  }
  var objToDTO = function (rawObj) {
    var isHostedOnCloudinary = rawObj && rawObj.url && rawObj.url.indexOf("cloudinary.com/") > 0 && rawObj.url.indexOf("/upload") > 0;
    JSONResponseUtils.replaceIdField(rawObj);
    if (process.env.CLOUDINARY_POI_IMG_XFORM) { // c_scale,w_640
      if (isHostedOnCloudinary) {
        rawObj.url = rawObj.url.replace("/upload", "/upload/" + process.env.CLOUDINARY_POI_IMG_XFORM);
        if (rawObj.secure_url && rawObj.secure_url.indexOf("cloudinary.com/") > 0 && rawObj.secure_url.indexOf("/upload") > 0) {
          rawObj.secure_url = rawObj.secure_url.replace("/upload", "/upload/" + process.env.CLOUDINARY_POI_IMG_XFORM);
        }
      }
    }
    // add 'snapple' 640x80 image if it's a cloudinary image
    if (isHostedOnCloudinary) {
      rawObj.w640h80_url = getSnappleImageUrl(rawObj.url);
    }
  };
  if (_.isArray(obj)) {
    _.each(obj, objToDTO);
  }
  objToDTO(obj);
};


/*
example response:
 [
 {
 "public_id": "d0pegedkavxqsk6n3tqd",
 "version": 1400873741,
 "signature": "8ba365cee3e2d9045634140ba0b5c9c639b569ff",
 "width": 2536,
 "height": 1284,
 "format": "png",
 "resource_type": "image",
 "created_at": "2014-05-23T19:35:41Z",
 "bytes": 558065,
 "type": "upload",
 "etag": "65faf3761db5845097b189181183e42e",
 "url": "http://res.cloudinary.com/hbab5hodz/image/upload/v1400873741/d0pegedkavxqsk6n3tqd.png",
 "secure_url": "https://res.cloudinary.com/hbab5hodz/image/upload/v1400873741/d0pegedkavxqsk6n3tqd.png",
 "businessId": "534f106b22e436df1cb679ca",
 "name": "ss8.png",
 "lastModifiedDate": "2014-05-23T19:35:40.068Z",
 "description": "",
 "_id": "537fa30ed4bcf600004006ea"
 }
 ]
 */
exports.getBusinessImages = function (db) {
  return function (req, res) {
    var id = req.params.id;
    businessImagesDAO.getBusinessImages(db, id, function (err, images) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding images for business. " + err);
      } else {
        transformToImageDTO(images);
        res.json(images);
      }
    });
  };
};


exports.setPrimaryImageForBusiness = function (db) {
  return function (req, res) {
    var businessId = req.params.businessId,
      imageId = req.params.imageId;
    businessDAO.setPrimaryImage(db, businessId, imageId, function (err, result) {
      if (err) {
        RequestUtils.errorResponse(res, "Error updating primary image for business. " + err);
      } else {
        console.log("successfully updated primary image for business " + businessId + ". result: " + util.inspect(result));
        res.json(200, null);
      }
    });
  };
};


exports.findPossibleDuplicates = function (db) {
  return function (req, res) {
    var geoQuery = {},
      geo = {},
      searchOptions = {},
      sortExpression = {name: 1},
      placeId = RequestUtils.getFieldIfExists('place_id', req),
      queryByPlaceId = {place_id: placeId};

    RequestUtils.logRequestParams(req, 'findPossibleDuplicates()');
    RequestUtils.setFieldsIfExist(['long', 'lat', 'maxDistance'], req, geo);
    if (geo.long && geo.lat) {
      RequestUtils.buildQueryObjectForGeospatialNear(geoQuery, 'loc', geo.long, geo.lat, 100);
    }
    RequestUtils.buildQueryObjectForStrings(geoQuery, ['name'], req);
    searchOptions.sort = sortExpression;

    businesses(db).findItems(queryByPlaceId, searchOptions, function (err, items) {
      if (err) {
        RequestUtils.errorResponse(res, "Error finding possible duplicate businesses by place_id. " + err);
      } else {
        transformToBusinessDTO(items, req);
        if (_.isArray(items) && items.length > 0) {
          console.log("found " + items.length + " match by place_id " + placeId);
          res.json(items);
        } else {
          // no exact match found for place_id, so do subsequent geo query
          businesses(db).findItems(geoQuery, searchOptions, function (error, possibleDupes) {
            if (error) {
              RequestUtils.errorResponse(res, "Error finding possible duplicate businesses. " + error);
            } else {
              transformToBusinessDTO(possibleDupes, req);
              res.json(possibleDupes);
            }
          });
        }
      }
    });
  };
};


