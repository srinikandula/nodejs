"use strict";

var _ = require('underscore')
  , RequestUtils = require('../lib/requestUtils')
  , JSONResponseUtils = require('../lib/jsonResponseUtils')
  , mongoskin = require('mongoskin')
  , SecurityUtils = require('../lib/securityUtils');

var FRONT_PAGE_IMAGES = 'frontPageImages';
var beacons = function (db) {
  return db.collection(FRONT_PAGE_IMAGES);
};

exports.generateStubbedTestResponse = function (db) {
  var images = [
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435626/eat_1_hiq09t.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435634/eat_2_cslfsl.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435640/eat_3_kl3rpg.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435646/heal_1_o7ecuu.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435651/heal_2_gimtd9.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435656/heal_4_ausmzw.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435661/move_1_mdr3ti.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435666/move_2_gwtfad.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435670/move_3_wgpjnz.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435674/move_4_x5dfwy.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435679/move_5_fruwmb.jpg',
    'http://res.cloudinary.com/hbab5hodz/image/upload/v1406435689/move_6_stghjx.jpg'
  ];
  var greetings = [
    'Good morning!',
    'Good afternoon!',
    'Good evening!',
    'TGIF!'
  ];
  var suggestions = [
    'Are you looking for an organic smoothie in TriBeCa?'
  ];
  var categoryIds = [
    '5354ca6180e4b802000964cd', // hard-coded 'Eat' category from production
    '5354ca5c80e4b802000964cc', // hard-coded 'Heal' category from production
    '53a36c5e215c340200433971' // hard-coded 'Move' category from production
  ];
  var neighborhoods = [
    {name: 'Chelsea', id: '53e9465b487f0910f9f6cb32'},
    {name: 'SoHo', id: '53e9465b487f0910f9f6cb42'},
    {name: 'TriBeCa', id: '53e9465b487f0910f9f6cb44'},
    {name: "East Village", id: '53e9465b487f0910f9f6cb37'}
  ];
  return function (req, res) {
    SecurityUtils.hasRole(req, ['']);
    var randomImage = images[_.random(0, images.length - 1)],
      randomGreeting = greetings[_.random(0, greetings.length - 1)],
      randomSuggestion = suggestions[_.random(0, suggestions.length - 1)],
      randomCategoryId = categoryIds[_.random(0, categoryIds.length - 1)],
      randomNeighborhood = neighborhoods[_.random(0, neighborhoods.length - 1)],
      frontPageData;
    if (!RequestUtils.setFieldAsFloatIfExists('lat', req, {})) {
      RequestUtils.errorResponse(res, "The parameter 'lat' is required.");
    }
    if (!RequestUtils.setFieldAsFloatIfExists('long', req, {})) {
      RequestUtils.errorResponse(res, "The parameter 'long' is required.");
    }
    frontPageData = {
        img: randomImage,
        greeting: randomGreeting,
        suggestion: randomSuggestion,
        filters: {
          // ***ALL VALUES OPTIONAL***.  They should be used to construct the query string that is passed to GET /api/v1/businesses
          // example values:
          //
          // neighborhood: neighborhood
          categoryId: randomCategoryId,
          neighborhoodGeoIds: randomNeighborhood.id
          // categoryTypeId: categoryTypeId
          // categorySubTypeId: categorySubTypeId
          //
          // There could be any number of additional parameters here.
        }
      };
    res.json(frontPageData);
  };
};
