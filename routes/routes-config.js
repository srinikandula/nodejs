'use strict';

var beacon = require('./beacon'),
  classification = require('./classification'),
  business = require('./business'),
  poi = require('./poi'),
  neighborhood = require('./neighborhood'),
  neighborhoodGeo = require('./neighborhoodGeo'),
  conditions = require('./condition'),
  procedures = require('./procedure'),
  appConfig = require('./appConfig.js'),
  frontPage = require('./frontpage.js'),
  user = require('./user.js'),
  formidable = require('formidable'),
  cloudinary = require('cloudinary'),
  _ = require('underscore'),
  auth = require('./auth.js');

cloudinary.config({
  cloud_name: 'hbab5hodz',
  api_key: '653291545935396',
  api_secret: '3HgU_KuRQgiT7h0HnYUtyRmlX6Q'
});



var nocache = function (req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.setHeader('Last-Modified', (new Date()).toUTCString());
  next();
};


// ================== Route definitions ==================

exports.configureRoutes = function (app, db, passport) {

  app.get('/', nocache, auth.home(db));
  app.get('/register', nocache, auth.getRegistrationView(db));
  app.post('/register', nocache, auth.submitRegistration(db));
  app.get('/login', nocache, auth.getLoginView(db));
  app.post('/login', passport.authenticate(
    'stormpath',
    {
      successRedirect: '/console',
      failureRedirect: '/login',
      failureFlash: true
    }
  ));
  app.get('/logout', nocache, auth.logout(db));
  app.get('/forgotPassword', nocache, auth.getForgotPasswordView(db));
  app.post('/forgotPassword', nocache, auth.submitForgotPassword(db));

  app.get('/tos', nocache, function (req, res) { res.render('tos'); });
  app.get('/privacy', nocache, function (req, res) { res.render('privacypolicy'); });

  var apiPrefix = '/api/v1';

  // user routes
  app.get(apiPrefix + '/user/me', nocache, user.getCurrentUser(db));
  app.get(apiPrefix + '/user/groups', nocache, user.getGroupsForCurrentUser(db));

  // beacon routes
  app.get(apiPrefix + '/beacons/count', nocache, beacon.countBeacons(db));
  app.get(apiPrefix + '/beacons', nocache, beacon.listAllBeacons(db));
  app.get(apiPrefix + '/beacons/:id', nocache, beacon.getBeacon(db));
  app.post(apiPrefix + '/beacons', nocache, beacon.addBeacon(db));
  app.put(apiPrefix + '/beacons/:id', nocache, beacon.editBeacon(db));
  app.delete(apiPrefix + '/beacons/:id', nocache, beacon.deleteBeacon(db));
  app.post(apiPrefix + '/beacons/:id/businesses/:businessId', nocache, beacon.addBusinessToBeacon(db));
  app.delete(apiPrefix + '/beacons/:id/businesses/:businessId', nocache, beacon.removeBusinessFromBeacon(db));
  app.get(apiPrefix + '/beacons/:id/images', nocache, beacon.getBeaconImages(db));

  // classification aka category routes
  _.each(['classifications', 'categories'], function (val) {
    var resourceBasePath = '/' + val;
    app.get(apiPrefix + resourceBasePath, nocache, classification.listAllClassifications(db));
    app.get(apiPrefix + resourceBasePath + '/:id', nocache, classification.getClassification(db));
    app.put(apiPrefix + resourceBasePath + '/:id', nocache, classification.setClassificationVisibilityAndName(db)); // for updating 'visible' flag
    app.post(apiPrefix + resourceBasePath, nocache, classification.addClassification(db));
    app.post(apiPrefix + resourceBasePath + '/:id', nocache, classification.addClassificationType(db));
    app.post(apiPrefix + resourceBasePath + '/:id/:typeId', nocache, classification.addClassificationSubType(db));
    app.put(apiPrefix + resourceBasePath + '/:id/:typeId', nocache, classification.setCategoryTypeName(db));
    app.delete(apiPrefix + resourceBasePath + '/:id', nocache, classification.deleteClassification(db));
    app.delete(apiPrefix + resourceBasePath + '/:id/:typeId', nocache, classification.removeClassificationType(db));
    app.delete(apiPrefix + resourceBasePath + '/:id/:typeId/:subTypeId', nocache, classification.removeClassificationSubType(db));
    app.put(apiPrefix + resourceBasePath + '/:id/:typeId/:subTypeId', nocache, classification.setCategorySubTypeName(db));
  });

  // business routes
  app.get('/poiview/:id', nocache, poi.getPOIView(db));
  app.get('/poi-index/:catName', nocache, poi.poiIndexPage(db));
  app.get('/poi-index-move', nocache, poi.getPOIView(db));
  app.get('/poi-index-heal', nocache, poi.getPOIView(db));
  app.get(apiPrefix + '/poi/:id', nocache, poi.getPOIForSharing(db));
  app.get(apiPrefix + '/businesses/count', nocache, business.countBusinesses(db));
  app.get(apiPrefix + '/businesses', nocache, business.findBusinesses(db));
  app.get(apiPrefix + '/businessesMinimal', nocache, business.findBusinessesMinimal(db));
  app.get(apiPrefix + '/businesses/:id', nocache, business.getBusiness(db));
  app.post(apiPrefix + '/businesses', nocache, business.addBusiness(db));
  app.post(apiPrefix + '/businesses/:id/images', nocache, business.addImageOfBusiness(db, formidable, cloudinary));
  app.get(apiPrefix + '/businesses/:id/images', nocache, business.getBusinessImages(db));
  app.put(apiPrefix + '/businesses/:businessId/images/:imageId/primary', nocache, business.setPrimaryImageForBusiness(db));
  app.delete(apiPrefix + '/businesses/:businessId/images/:imageId', nocache, business.removeImageFromBusiness(db, cloudinary));
  app.put(apiPrefix + '/businesses/:id', nocache, business.editBusiness(db));
  app.delete(apiPrefix + '/businesses/:id', nocache, business.deleteBusiness(db));
  app.post(apiPrefix + '/businesses/:id/beacons/:beaconId', nocache, business.addBeaconToBusiness(db));
  app.delete(apiPrefix + '/businesses/:id/beacons/:beaconId', nocache, business.removeBeaconFromBusiness(db));
  app.post(apiPrefix + '/businesses/:id/categories/:catId', nocache, business.addCategoryToBusiness(db));
  app.post(apiPrefix + '/businesses/:id/categories/:catId/:catTypeId', nocache, business.addCategoryToBusiness(db));
  app.post(apiPrefix + '/businesses/:id/categories/:catId/:catTypeId/:catSubTypeId', nocache, business.addCategoryToBusiness(db));
  app.delete(apiPrefix + '/businesses/:id/categories/:catId', nocache, business.removeCategoryFromBusiness(db));
  app.delete(apiPrefix + '/businesses/:id/categories/:catId/:catTypeId', nocache, business.removeCategoryFromBusiness(db));
  app.delete(apiPrefix + '/businesses/:id/categories/:catId/:catTypeId/:catSubTypeId', nocache, business.removeCategoryFromBusiness(db));
  app.put(apiPrefix + '/businesses/:id/neighborhoods', nocache, business.setNeighborhoodsForBusiness(db));
  app.get(apiPrefix + '/businesses_dupe_check', nocache, business.findPossibleDuplicates(db));

  app.post(apiPrefix + '/businesses/:id/conditions', business.setConditionsOnBusiness(db));
  app.post(apiPrefix + '/businesses/:id/procedures', business.setProceduresOnBusiness(db));


  // neighborhood routes
  app.get(apiPrefix + '/cities', nocache, neighborhoodGeo.findCities(db));
//  app.get(apiPrefix + '/cities', nocache, neighborhood.getStatesWithCities(db));
  app.get(apiPrefix + '/city', nocache, neighborhoodGeo.findCityByCityAndState(db));
  app.put(apiPrefix + '/city/:id', nocache, neighborhoodGeo.updateCity(db));
//  app.get(apiPrefix + '/neighborhood', nocache, neighborhood.findAll(db));
//  app.get(apiPrefix + '/neighborhoods', nocache, neighborhood.findByCityState(db));
//  app.post(apiPrefix + '/neighborhoods', nocache, neighborhood.addNeighborhoodToCityState(db));
//  app.delete(apiPrefix + '/neighborhoods/:id', nocache, neighborhood.deleteNeighborhoodFromCity(db));

  // neighborhood geo routes (admin-only)
  app.get(apiPrefix + '/neighborhoodGeo', nocache, neighborhoodGeo.findNeighborhoods(db));
  app.post(apiPrefix + '/neighborhoodGeo', nocache, neighborhoodGeo.addNeighborhood(db));
  app.get(apiPrefix + '/neighborhoodGeo/:id', nocache, neighborhoodGeo.findById(db));
  app.delete(apiPrefix + '/neighborhoodGeo/:id', nocache, neighborhoodGeo.deleteNeighborhood(db));
  app.get(apiPrefix + '/neighborhoodGeos', nocache, neighborhoodGeo.findAll(db));
  app.get(apiPrefix + '/neighborhoodGeo/:id/children', nocache, neighborhoodGeo.findNeighborhoodsByParentId(db));


  // conditions
  app.get(apiPrefix + '/conditions', conditions.findAll(db));
  app.get(apiPrefix + '/conditions/:id', conditions.getCondition(db));
  app.put(apiPrefix + '/conditions/:id', conditions.editCondition(db));
  app.post(apiPrefix + '/conditions', conditions.addCondition(db));
  app.delete(apiPrefix + '/conditions/:id', conditions.deleteCondition(db));

  // procedures
  app.get(apiPrefix + '/procedures', procedures.findAll(db));
  app.get(apiPrefix + '/procedures/:id', procedures.getProcedure(db));
  app.put(apiPrefix + '/procedures/:id', procedures.editProcedure(db));
  app.post(apiPrefix + '/procedures', procedures.addProcedure(db));
  app.delete(apiPrefix + '/procedures/:id', procedures.deleteProcedure(db));

  // (web) application configuration
  app.get(apiPrefix + '/appconfig', appConfig.getAppConfigProperties());

  // front page context
  app.get(apiPrefix + '/frontPage', nocache, frontPage.generateStubbedTestResponse(db));


  app.get(apiPrefix + '/npc', nocache, neighborhoodGeo.calculateAndSetPOICountForNeighborhoodGeo(db));

  app.get(apiPrefix + '/accounts', nocache, auth.getAccounts(db));
  app.get(apiPrefix + '/account', nocache, auth.getAccount(db));
  app.put(apiPrefix + '/accountCustomData', nocache, auth.saveAccountCustomData(db));
// ================= end route definitions =================

};


