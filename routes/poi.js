"use strict";

var _ = require('underscore')
  , util = require('util')
  , businessDAO = require('../lib/dao/businessDAO')
  , businessController = require('./business')
  , businessImagesDAO = require('../lib/dao/businessImagesDAO')
  , classificationsDAO = require('../lib/dao/classificationsDAO')
  , RequestUtils = require('../lib/requestUtils')
  , CUSTOM_SNAPPLE_TRANSFORMATION_PARAMS = 'c_fill,w_640,h_480,q_70';


var getNameForClassificationTypeId = function (classificationId, classificationTypeIds, classificationTypes, classificationTypesMap) {
    if (!classificationTypes) {
      return null;
    }
    var classTypes = classificationTypes[classificationId],
      classTypeObjs = [];
    if (!classificationId || !classificationTypeIds || !classificationTypesMap) {
      return null;
    }
    if (_.isArray(classificationTypeIds)) {
      classTypeObjs = _.map(classificationTypeIds, function (ctId) {
        return classificationTypesMap[ctId];
      });
      return _.pluck(_.compact(classTypeObjs), 'name');
    }
    return classTypes[classificationTypeIds];
};

var getClassificationTypeNamesFunc = function (classificationTypes, classificationTypesMap) {
  return function (classificationId, classificationTypeIds) {
    if (_.isEmpty(classificationTypeIds) || !_.isArray(classificationTypeIds)) {
      return [];
    }
    var namesUnsorted = getNameForClassificationTypeId(classificationId, classificationTypeIds, classificationTypes, classificationTypesMap);
    return _.compact(namesUnsorted || []).sort();
  };
};

var getFormattedAddressForBusiness = function (business) {
  if (!business) {
    return null;
  }
  var addr = '';
  if (business.addr1) {
    addr += business.addr1;
  }
  if (business.addr2) {
    addr += (addr ? ', ' : '') + business.addr2;
  }
  if (!addr.trim()) {
    return '';
  }
  if (business.city) {
    addr += (addr ? ', ' : '') + business.city;
  }
  if (business.state) {
    addr += (addr ? ', ' : '') + business.state;
  }
  return (addr || '').trim();
};

var augmentBusinessForPOIView = function (business, images) {
  if (business) {
    business.neighborhoodMostSpecific = business.neighborhoodsDisplayValue;
    business.images = images || [];
    if (business.primaryImageId) {
      business.images.sort(function (a, b) {
        if (a.id === business.primaryImageId) {
          return -1;
        }
        if (b.id === business.primaryImageId) {
          return 1;
        }
        if (a.id === b.id) {
          return 0;
        }
        return a.id < b.id ? -1 : 1;
      });
    }
    business.snappleImages = [];
    business.images.forEach(function (img) {
      img.snappleUrl = businessController.getSnappleImageUrl(img.url, CUSTOM_SNAPPLE_TRANSFORMATION_PARAMS);
    });
    business.formattedAddress = getFormattedAddressForBusiness(business);
  }
  return business;
};

var buildCategoryTypesAndSubTypesMaps = function (categoriesList) {
  var catTypesMap = {}
    , catSubTypesMap = {};
  if (categoriesList && _.isArray(categoriesList)) {
    _.each(categoriesList, function (category) {
      if (category && category.types && _.isArray(category.types)) {
        _.each(category.types, function (categoryType) {
          catTypesMap[category._id + ':' + categoryType.id] = categoryType;
          if (categoryType && categoryType.subtypes && _.isArray(categoryType.subtypes)) {
            _.each(categoryType.subtypes, function (catSubType) {
              catSubTypesMap[category._id + ':' + categoryType.id + ':' + catSubType.id] = catSubType;
            });
          }
        });
      }
    });
  }
  return [catTypesMap, catSubTypesMap];
};



/**
 * renders a mobile-friendly/responsive read-only view of the POI
 * @param db
 */
exports.getPOIView = function (db) {
  return function (req, res) {
    var id = req.params.id;
    classificationsDAO.fetchAndBuildClassificationsMap(db, function (fabcmErr, classificationsMap, classificationsList) {
      if (fabcmErr) {
        res.render('poi-error', {title: 'Could not load data for POI', user: null});
      } else {
        var classifications = _.sortBy(classificationsList, 'name')
          , maps = buildCategoryTypesAndSubTypesMaps(classificationsList)
          , categoryTypesMap = maps[0]
          , categorySubTypesMap = maps[1];
        businessDAO.findBusinessById(db, id, function (fbbiErr, business) {
          if (fbbiErr) {
            res.render('poi-error', {title: 'POI Not Found', user: null});
          } else {
            if (!business || !business.published) {
              res.render('poi-error', {title: 'Invalid POI specified.', user: null});
              return;
            }
            businessDAO.findNextAndPreviousBusinessesForCategory(db, business, function (fnbfcErr, previousAndNext) {
              if (fnbfcErr) {
                console.log("Error finding next business. " + util.inspect(fnbfcErr));
                res.render('poi-error', {title: 'Error finding next business.', user: null});
              } else {
                businessImagesDAO.getBusinessImages(db, id, function (gbiErr, images) {
                  if (gbiErr) {
                    res.render('poi-error', {title: 'Could not load POI data', user: null});
                  } else {
                    var dtoOptions = {
                        showCategoryDisplayValue: true,
                        showCategoryTypesDisplayValue: true,
                        showCategorySubTypesDisplayValue: true,
                        excludedCategoryNames: ['Eat', 'Move', 'Heal'],
                        classificationsMap: classificationsMap,
                        categoryTypesMap: categoryTypesMap,
                        categorySubTypesMap: categorySubTypesMap
                      }
                      , classificationTypes = {}
                      , classificationTypesMap = {}
                      , isEat, isMove, isHeal
                      , bsClassEatMoveHeal;
                    businessController.transformToBusinessDTO(business, req, dtoOptions);

                    classifications.forEach(function (classification) {
                      var tmpClassificationTypes = (classification && classification.types) ? classification.types : [];
                      classificationTypes[classification.id] = tmpClassificationTypes;
                      tmpClassificationTypes.forEach(function (tmpClassificationType) {
                        classificationTypesMap[tmpClassificationType.id] = tmpClassificationType;
                      });
                    });

                    isEat = business.categoryDisplayValue.indexOf('Eat') !== -1;
                    isMove = business.categoryDisplayValue.indexOf('Move') !== -1;
                    isHeal = business.categoryDisplayValue.indexOf('Heal') !== -1;
                    if (isEat) {
                      bsClassEatMoveHeal = 'success';
                    } else if (isMove) {
                      bsClassEatMoveHeal = 'warning';
                    } else if (isHeal) {
                      bsClassEatMoveHeal = 'info';
                    } else {
                      bsClassEatMoveHeal = 'success';
                    }

                    res.render('poi', {
                      title: business.name + ' - Get Well Cities',
                      business: augmentBusinessForPOIView(business, images),
                      user: req.user,
                      bsClassEatMoveHeal: bsClassEatMoveHeal,
                      classificationsMap: classificationsMap,
                      classifications: classifications,
                      classificationTypes: classificationTypes,
                      classificationTypesMap: classificationTypesMap,
                      _: _,
                      getClassificationTypeNames: getClassificationTypeNamesFunc(classificationTypes, classificationTypesMap),
                      nextBusinessId: previousAndNext && previousAndNext.nextBusiness ? previousAndNext.nextBusiness._id : null,
                      previousBusinessId: previousAndNext && previousAndNext.previousBusiness ? previousAndNext.previousBusiness._id : null
                    });
                  }
                });
              }
            });
          }
        });

      }
    });



  };
};





var getPrimaryImageForBusiness = function (db, businessId, callback) {
  if (!businessId) {
    return (_.isFunction(callback) && callback("blank business id", null));
  }

  businessDAO.findBusinessById(db, businessId, function (err, poi) {
    if (err || !poi) {
      return (_.isFunction(callback) && callback(util.format("Error finding POI with id of '%s'.  %s", businessId, err)));
    }

    var getFirstImageForBusiness = function (db, businessId, cb) {
      console.log("getFirstImageForBusiness -- " + businessId);
      businessImagesDAO.getBusinessImages(db, businessId, function (err, images) {
        if (err) {
          return (_.isFunction(cb) && cb(util.format("Error finding images for businessId '%s'. %s", businessId, err), null));
        }
        var firstImage = _.isArray(images) && images.length > 0 ? images[0] : null;
        return (_.isFunction(cb) && cb(null, firstImage));
      });
    };

    if (poi.primaryImageId) {
      businessImagesDAO.getImage(db, poi.primaryImageId, function (err, primaryImage) {
        if (err) {
          console.log(util.inspect("warning: primaryImageId '%s' for businesssId '%s' is invalid. %s", poi.primaryImageId, businessId, err), null);
          return getFirstImageForBusiness(db, businessId, callback);
        }
        return (_.isFunction(callback) && callback(null, primaryImage));
      });
    } else {
      return getFirstImageForBusiness(db, businessId, callback);
    }
  });
};


/**
 * returns a POI DTO with minimal core information about the specified POI
 */
exports.getPOIForSharing = function (db) {
  return function (req, res) {
    var id = req.params.id;
    businessDAO.findBusinessById(db, id, function (err, poi) {
      if (err) {
        RequestUtils.errorResponse(res, util.format("Error finding POI with id of '%s'.  %s", id, err));
      } else {
        getPrimaryImageForBusiness(db, id, function (err, primaryImage) {
          if (err) {
            RequestUtils.errorResponse(res, "Error finding images for POI. " + err);
          } else {
            var poiDTO = {
              name: poi.name,
              address: getFormattedAddressForBusiness(poi),
              phone: poi.phone || '',
              imageURL: '',
              url: poi.website || '',
              shareUrl: (process.env.POIVIEW_BASE_URL || (req.protocol + '://' + req.get('host'))) + "/poiview/" + id
            };
            if (primaryImage && primaryImage.url) {
              poiDTO.imageURL = primaryImage.url;
            }
            res.json(poiDTO);
          }
        });
      }
    });
  };
};

var getEatMoveHealCategoryIds = function (db, cb) {
  classificationsDAO.findAll(db, function (err, data) {
    if (err) {
      cb(err);
    } else {
      var emh = {eat: null, move: null, heal: null};
      data.forEach(function (cat) {
        if (cat.name === 'Eat') {
          emh.eat = cat._id.valueOf().toString();
        } else if (cat.name === 'Move') {
          emh.move = cat._id.valueOf().toString();
        } else if (cat.name === 'Heal') {
          emh.heal = cat._id.valueOf().toString();
        }
      });
      cb(null, emh);
    }
  });
};

exports.poiIndexPage = function (db) {
  return function (req, res) {
    var catName = req.params.catName;
    getEatMoveHealCategoryIds(db, function (gemhciErr, emhIds) {
      if (gemhciErr) {
        RequestUtils.errorResponse(res, 'Error getting eat/move/heal ids');
        return;
      }
      businessDAO.findBusinessesByCategoryId(db, emhIds[catName.toLowerCase()], function (fbbciErr, pois) {
        if (fbbciErr) {
          RequestUtils.errorResponse(res, 'Error getting POIs by category Id');
          return;
        }
        res.render('poi-index', {
          title: catName + ' index - Get Well',
          catName: catName,
          pois: pois
        });
      });
    });
  };
};
