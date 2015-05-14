'use strict';

var _ = require('underscore'),
  classificationDAO = require('../routes/classification'),
  GLOBAL_PENDING_NEIGHBORHOOD_NAME = require('../routes/neighborhood').GLOBAL_PENDING_NEIGHBORHOOD_NAME,
  neighborhoodGeoDAO = require('./dao/neighborhoodGeoDAO');

var mockRequest = function (body) {
  return {
    params: body,
    body: body,
    query: body
  };
};

var mockResponse = {
    json: _.identity
  };

var DataSeeder = {
  seedData: function (db) {
    /*
    var idsAndNames = [
      {id: 'insurance', name: 'Insurance', maxDepth: 1, visible: false},
      {id: 'alcohol', name: 'Alcohol', maxDepth: 1, visible: false},
      {id: 'ambiance', name: 'Ambiance', maxDepth: 1, visible: false},
      {id: 'attire', name: 'Attire', maxDepth: 1, visible: false},
      {id: 'cuisine', name: 'Cuisine', maxDepth: 1, visible: false},
      {id: 'goodFor', name: 'Good For', maxDepth: 1, visible: false},
      {id: 'noiseLevel', name: 'Noise Level', maxDepth: 1, visible: false},
      {id: 'parking', name: 'Parking', maxDepth: 1, visible: false},
      {id: 'paymentType', name: 'Payment Types', maxDepth: 1, visible: false}
    ];
    _.each(idsAndNames, function (val) {
      classificationDAO.findById(db, val.id, function (err, value) {
        if (err || value === null) {
          classificationDAO.addClassification(db)(mockRequest(val), mockResponse);
        } else {
          console.log("Skipping the seeding of classification '" + val.name + "' because it already exists.");
        }
      });
    });
    */
    // neighborhoodGeo (PENDING) value
    neighborhoodGeoDAO.findById(db, GLOBAL_PENDING_NEIGHBORHOOD_NAME, function (err, data) {
      if (err) {
        console.log("Error finding neighborhoodGeo with _id of " + GLOBAL_PENDING_NEIGHBORHOOD_NAME);
      } else {
        if (!data) {
          neighborhoodGeoDAO.addNeighborhood(db, {
            _id: GLOBAL_PENDING_NEIGHBORHOOD_NAME,
            name: GLOBAL_PENDING_NEIGHBORHOOD_NAME,
            geo_name: GLOBAL_PENDING_NEIGHBORHOOD_NAME,
            level: -999
          }, function (err, data) {
            if (err) {
              console.log("Error seeding (PENDING) neighborhood. " + JSON.stringify(err, null, 3));
            } else {
              console.log("(PENDING) neighborhood was seeded.");
            }
          });
        }
      }
    });
  }
};

module.exports = DataSeeder;