'use strict';

angular.module('beaconApp.apiDocsModule', [])
  .controller('APIDocsController', function ($scope, $log) {
    $log.info("Getting API Docs");
    $scope.headline = "REST API Docs";
    var d = function(method, url, notes, parameters, responseInfo) {
      return {method: method, url: url, notes: notes, parameters: parameters, responseInfo: responseInfo};
    };
    var p = function(name, type, description) {
      return {name: name, type: type, description: description};
    };
    var r = function(responseDescription, responseExample) {
      return {desc: responseDescription, example: responseExample};
    };
    $scope.apiInfo = {
      categories: [
        d('GET', '/categories', 'get all categories'),
        d('GET', '/categories/:id', 'get one category by id'),
        d('POST', '/categories', 'create new classification'),
        d('POST', '/categories/:id', 'create new category type under the specified category'),
        d('PUT', '/categories/:id', 'edit the specified category\'s visibilty and name.  This is an ADMIN-ONLY feature.', [
          p('name', 'string', 'The new name for this category.'),
          p('visible', 'boolean', 'indicates whether or not this classification is visible as an ordinary category or hidden because it is being used for other reasons.'),
          p('associatedClassificationIds', 'array of strings', 'the ids of classifications that are associated with this category.  If you supply this parameter, then no other parameters can be specified.')
        ]),
        d('POST', '/categories/:id/:typeId', 'create new category sub-type under the specified category and category type'),
        d('DELETE', '/categories/:id', 'delete the entire category and all of its types and sub-types'),
        d('DELETE', '/categories/:id/:typeId', 'delete the specified category type from its parent category'),
        d('DELETE', '/categories/:id/:typeId/:subTypeId', 'delete the specified category sub-type from its parent category type'),
        d('POST', '/beacons/:id/businesses/:businessId', 'add the specified business to the beacon'),
        d('DELETE', '/beacons/:id/businesses/:businessId', 'remove the specified business from the beacon')
      ],
      beacons: [
        d('GET', '/beacons', 'get all beacons filtered by search criteria.  Note: the latitude and longitude will be returned at top-level properties named \'lat\' and \'long\'', [
          p('lat', 'float', 'latitude of point of origin'),
          p('long', 'float', 'longitude of point of origin'),
          p('distance', 'float', 'max distance away from point of origin, in km'),
          p('pageSize', 'integer', 'maximum number of results to return'),
          p('pageNumber', 'integer', '1-based pagination')
        ]),
        d('GET', '/beacons/count', 'get how many total beacons are in the database'),
        d('GET', '/beacons/:id', 'get one beacon by id.  Note: the latitude and longitude will be returned at top-level properties named \'lat\' and \'long\''),
        d('GET', '/beacons/:id/images', 'get a list of metadata for images that are associated with this beacon'),
        d('POST', '/beacons', 'create a new beacon'),
        d('PUT', '/beacons/:id', 'update the specified beacon'),
        d('DELETE', '/beacons/:id', 'delete the specified beacon')
      ],
      businesses: [
        d('GET', '/businesses', 'get all businesses filtered by optional search criteria.  Note: the latitude and longitude will be returned at top-level properties named \'lat\' and \'long\'', [
          p('categoryId', 'string', 'Category ID'),
          p('categoryTypeId', 'string', 'Category Type ID.  If this is included, you must also include the parent id, categoryId.'),
          p('categorySubTypeId', 'string', 'Category Sub-type ID.  If this is included, you must also include both parent ids: categoryId and categoryTypeId.'),
          p('city', 'string', 'name of city.  this is case-sensitive.'),
          p('conditionId', 'string', 'id of the condition'),
          p('lat', 'float', 'latitude of point of origin'),
          p('long', 'float', 'longitude of point of origin'),
          p('featured', 'boolean', 'the value of the \'featured\' flag'),
          p('name', 'string', 'a search term that the name of the restaurant must contain'),
          p('neighborhood', 'string', '[ DEPRECATED -- DO NOT USE ] - name of the neighborhood'),
          p('neighborhoodGeoIds', 'string (array of)', 'ids of the neighborhoods that should be included'),
          p('maxDistance', 'float', 'max distance away from point of origin, in meters'),
          p('pageSize', 'integer', 'maximum number of results to return'),
          p('pageNumber', 'integer', '1-based pagination'),
          p('procedureId', 'string', 'id of the procedure'),
          p('orderBy', 'string', 'name of field to sort by.  Example values: name, createdAt, rating, city.'),
          p('orderDir', 'string', 'direction of sort, either "asc" or "desc"'),
          p('published', 'string', '(must have admin or curator role.  Do NOT use in consumer application.) - true/false/null/"all" - value of "published" flag.  null or "all" means all'),
          p('search', 'string', 'a search string'),
          p('state', 'string', '2-letter abbreviation for US state, upper-case.')
        ]),
        d('GET', '/businesses/:id', 'get one business by id.  Note: the latitude and longitude will be returned at top-level properties named \'lat\' and \'long\''),
        d('GET', '/poi/:id', 'get minimal info for a business (aka POI), which can be used for sharing via SMS, MMS, Facebook, Twitter, etc.', [],
          r(
          'A minimal set of information about the specified POI', {
            name: "Whole Foods Market",
            address: "808 Columbus Ave, New York, NY",
            phone: '2122226160',
            imageURL: "http://res.cloudinary.com/hbab5hodz/image/upload/v1406590635/c7m1pzm9nzfh1vx0kavw.jpg",
            url: "http://www.wholefoodsmarket.com/stores/upperwestside"
          }
        )),
        d('GET', '/businesses/count', 'get how many total businesses are in the database, filtered by the following optional parameters', [
          p('categoryId', 'string', 'Category ID'),
          p('categoryTypeId', 'string', 'Category Type ID.  If this is included, you must also include the parent id, categoryId.'),
          p('categorySubTypeId', 'string', 'Category Sub-type ID.  If this is included, you must also include both parent ids: categoryId and categoryTypeId.'),
          p('conditionId', 'string', 'id of the condition'),
          p('lat', 'float', 'latitude of point of origin'),
          p('long', 'float', 'longitude of point of origin'),
          p('featured', 'boolean', 'the value of the \'featured\' flag'),
          p('name', 'string', 'a search term that the name of the restaurant must contain'),
          p('neighborhood', 'string', 'name of the neighborhood'),
          p('maxDistance', 'float', 'max distance away from point of origin, in meters'),
          p('procedureId', 'string', 'id of the procedure'),
          p('published', 'string', '(must have admin or curator role.  Do NOT use in consumer application.) - true/false/null/"all" - value of "published" flag.  null or "all" means all')
        ]),
        d('POST', '/businesses', 'create a new business'),
        d('PUT', '/businesses/:id', 'update the specified business'),
        d('DELETE', '/businesses/:id', 'delete the specified business'),
        d('POST', '/businesses/:id/beacons/:beaconId', 'add the specified beacon to the business'),
        d('DELETE', '/businesses/:id/beacons/:beaconId', 'remove the specified beacon from the business'),
        d('POST', '/businesses/:id/images', 'upload an image of the specified business'),
        d('GET', '/businesses/:id/images', 'Get a list of all images for the business'),
        d('POST', '/businesses/:id/categories/ :categoryId', 'Associate the specified category with this business.'),
        d('POST', '/businesses/:id/categories/ :categoryId/:categoryTypeId', 'Associate the specified category type (and parent category) with this business.'),
        d('POST', '/businesses/:id/categories/ :categoryId/:categoryTypeId/:categorySubTypeId', 'Associate the specified category sub-type (and parent category type and parent category) with this business.'),
        d('DELETE', '/businesses/:id/categories/ :categoryId', 'Disassociate the specified category from this business.  All children category types and category sub-types will also be disassociated.'),
        d('DELETE', '/businesses/:id/categories/ :categoryId/:categoryTypeId', 'Disassociate the specified category type from this business.  All children category sub-types will also be disassociated.'),
        d('DELETE', '/businesses/:id/categories/ :categoryId/:categoryTypeId/:categorySubTypeId', 'Disassociate the specified category sub-type from this business.'),
        d('PUT', '/businesses/:id/neighborhoods', 'sets the neighborhoods (one or more) for the specified business', [
          p('neighborhoods', 'array of strings', 'Name of the neighborhood(s).  Tip: use Content-Type: application/json to more easily submit the array of values.')
        ]),
        d('POST', '/businesses/:id/conditions', 'set the list of conditions on a business'),
        d('POST', '/businesses/:id/procedures', 'set the list of procedures on a business')
      ],
      neighborhoods: [
        /*
        d('POST', '/neighborhoods', 'add', [
          p('city', 'string', 'name of the city'),
          p('state', 'string', '2-letter state abbreviations'),
          p('neighborhood', 'string', 'name of the neighborhood to add')
        ]),
        */
        /*
        d('GET', '/neighborhoods', 'get a list of neighborhoods for the specified city and state', [
          p('city', 'string', 'name of the city'),
          p('state', 'string', '2-letter state abbreviations')
        ]),
        */
        d('GET', '/city', 'Get a city by specifying city and state', [
          p('city', 'string', 'city name.  case-sensitive'),
          p('state', 'string', '2-letter state abbreviation, in uppercase')
        ]), r('a city DTO object', {
          "name": "New York",
          "city": "New York",
          "state": "NY",
          "level": 0,
          "parent_name": "New York",
          "parentId": null,
          "id": "53f6e78367d32ec29130b1e1",
          "long": -73.959722,
          "lat": 40.790278
        }),
        d('GET', '/cities', 'Get a list of cities.  This will either contain ALL cities, or a list of the closest cities to the specified coordinates', [
          p('lat', 'float', '(optional) - latitude'),
          p('long', 'float', '(optional) - longitude')
        ], r('an array of city DTO objects, which look like this:', [
          {
            "name": "New York",
            "city": "New York",
            "state": "NY",
            "level": 0,
            "parent_name": "New York",
            "parentId": null,
            "id": "53f6e78367d32ec29130b1e1",
            "long": -73.959722,
            "lat": 40.790278
          },
          {
            "name": "San Francisco",
            "city": "San Francisco",
            "state": "CA",
            "level": 0,
            "parent_name": "California",
            "parentId": null,
            "id": "53f6e78367d32ec29130b1e2",
            "long": -122.41941550000001,
            "lat": 37.7749295
          },
          {
            "name": "Seattle",
            "city": "Seattle",
            "state": "WA",
            "level": 0,
            "parent_name": "Washington",
            "parentId": null,
            "id": "53f6e78367d32ec29130b1e3",
            "long": -122.3320708,
            "lat": 47.6062095
          }
        ])),
        /*
        d('GET', '/cities', ' *** DEPRECATED *** get all of the cities, grouped by state.', [],
          r('An object where the keys are the state 2-letter abbreviation and the value is an alphabetized list of cities for that state.',
            {
              "AK": [
                "Juno"
              ],
              "CA": [
                "Los Angeles",
                "Palo Alto",
                "San Francisco"
              ],
              "IL": [
                "Chicago",
                "Naperville"
              ],
              "IN": [
                "Crown Point",
                "Fort Wayne",
                "Hobart",
                "Indianapolis",
                "Michigan City",
                "South Bend"
              ],
              "NY": [
                "Albany",
                "New York"
              ]
            })),
        */
        d('GET', '/neighborhoodGeo/:id', 'get neighborhoodGeo by id', [
          p('geo', 'boolean', '(optional) should the results contain GeoJSON polygons for the neighborhoods.  Default is false.')
        ], r('A neighborhoodGeo object', {
          "name": "Pleasant Plains",
          "city": "Staten Island",
          "state": "NY",
          "level": 3,
          "parentId": "53f199fa75a1df677f2157e3",
          "id": "53e9465b487f0910f9f6cc5e"
        })),

        d('GET', '/neighborhoodGeo/:id/children', 'get all children neighborhoods for the specified parent neighborhood id', [
          p('recursive', 'boolean', '(optional) ALL ancestors are recursively returned'),
          p('geo', 'boolean', '(optional) should the results contain GeoJSON polygons for the neighborhoods.  Default is false.'),
          p('tree', 'boolean', '(optional) indicates that the results JSON should be changed into a tree structure, where each neighborhood has a property called "children", which is an array of other neighborhoods'),
          p('flattenAtDepth', 'int', '(optional, use in conjunction with "tree") - this will flatten the tree starting at depth N, and all children/grandchildren/etc will be flattened to depth N.')
        ], r('an array of neighborhood objects', [])),

        d('POST', '/neighborhoodGeo', 'add a new city/state/neighborhood', [
          p('name', 'string', 'Name of the city / borough / neighborhood'),
          p('city', 'string', 'name of City.  Please be careful to use proper spelling and capitalization'),
          p('state', 'string', '2-letter US state abbreviation, in uppercase'),
          p('path', 'string', '(optional) a unique string to help identify this, in all lower case, with no spaces, only hyphens. e.g. upper-carnegie-hill-manhattan'),
          p('geo_name', 'string', 'same as "name", but intended to be more official whereas "name" might be altered slightly for readability or clarity.  But 99% of the time it is the same.'),
          p('parent_path', 'string', 'the value of the "path" field from the parent city/borough/neighborhood'),
          p('parent_name', 'string', 'the "name" field from the parent object'),
          p('parentId', 'string', 'the id of the city/borough/neighborhood to which this new neighborhood belongs'),
          p('level', 'int', '0 for a city, 1 for a borough/neighborhood within that city, 2 for a more specific neighborhood within that borough or neighborhood, 3, 4, 5...... etc.'),
          p('position', 'int', '(optional) ordinal value that can be used for sorting on the client side, if so desired.')
        ], r('the newly created entity', {})),

        d('GET', '/neighborhoodGeo', 'get neighborhoods for the specified lat/long or belonging to the specified city/state (must be one pair or the other)', [
          p('lat', 'float', 'latitude (optional)'),
          p('long', 'float', 'longitude (optional)'),
          p('city', 'string', 'city name (optional)'),
          p('state', 'string', '2-letter state abbreviation in upper-case (optional)'),
          p('recursive', 'boolean', '(optional) ALL ancestors are recursively returned.  This option can only be used with city/state combo.  YOU WILL RECEIVE AN ERROR if you try to use it with lat/long.'),
          p('tree', 'boolean', '(optional) indicates that the results JSON should be changed into a tree structure, where each neighborhood has a property called "children", which is an array of other neighborhoods'),
          p('flattenAtDepth', 'int', '(optional, use in conjunction with "tree") - this will flatten the tree starting at depth N, and all children/grandchildren/etc will be flattened to depth N.')
        ], r('An array of neighborhoodGeo objects', [
          {
            "name": "Upper West Side",
            "city": "New York",
            "state": "NY",
            "level": 3,
            "parentId": "53e9465b487f0910f9f6cb61",
            "id": "53e9465b487f0910f9f6cb65"
          },
          {
            "name": "All Upper West Side",
            "city": "New York",
            "state": "NY",
            "level": 2,
            "parentId": "53e9465b487f0910f9f6cb2f",
            "id": "53e9465b487f0910f9f6cb61"
          },
          {
            "name": "Manhattan",
            "city": "New York",
            "state": "NY",
            "level": 1,
            "parentId": null,
            "id": "53e9465b487f0910f9f6cb2f"
          }
        ])),
        d('GET', '/neighborhoodGeos', 'get *ALL* neighborhoods', [
          p('geo', 'boolean', '(optional) should the results contain GeoJSON polygons for the neighborhoods.  Default is false.')
        ], r('An array of neighborhoodGeo objects', [
          {
            "name": "Old Mill Basin",
            "city": "Brooklyn",
            "state": "NY",
            "level": 2,
            "parentId": "53e9465b487f0910f9f6cb67",
            "id": "53e9465b487f0910f9f6cb99"
          },
          {
            "name": "Forest Hills",
            "city": "Forest Hills",
            "state": "NY",
            "level": 2,
            "parentId": "53e9465b487f0910f9f6cba8",
            "id": "53e9465b487f0910f9f6cbbc"
          },
          {
            "name": "Pleasant Plains",
            "city": "Staten Island",
            "state": "NY",
            "level": 3,
            "parentId": "53f199fa75a1df677f2157e3",
            "id": "53e9465b487f0910f9f6cc5e"
          }
        ]))
      ],
      conditions: [
        d('GET', '/conditions', 'get all conditions'),
        d('GET', '/conditions/:id', 'get one condition by id.'),
        d('POST', '/conditions', 'create a new condition', [
          p('name', 'string', 'name'),
          p('description', 'string', 'description'),
          p('cptCode', 'string', 'CPT Code')
        ]),
        d('PUT', '/conditions/:id', 'update the specified condition', [
          p('name', 'string', 'name'),
          p('description', 'string', 'description'),
          p('cptCode', 'string', 'CPT Code')
        ]),
        d('DELETE', '/conditions/:id', 'delete the specified condition')
      ],
      procedures: [
        d('GET', '/procedures', 'get all procedures'),
        d('GET', '/procedures/:id', 'get one procedure by id.'),
        d('POST', '/procedures', 'create a new procedure', [
          p('name', 'string', 'name'),
          p('description', 'string', 'description')
        ]),
        d('PUT', '/procedures/:id', 'update the specified procedure', [
          p('name', 'string', 'name'),
          p('description', 'string', 'description')
        ]),
        d('DELETE', '/procedures/:id', 'delete the specified procedure')
      ],
      frontPage: [
        d('GET', '/frontPage', 'retrieve customized metadata used for rendering the front page', [
          p('lat', 'float', 'latitude of point of origin'),
          p('long', 'float', 'longitude of point of origin')
        ], r('*** WORK IN PROGRESS ***  NOTE: the "filter" property contains a dynamic list of values.  The intention is that each property name/value can be directly used as query parameters that can be used to call the /businesses web service', {
          "img": "http://res.cloudinary.com/hbab5hodz/image/upload/v1406435666/move_2_gwtfad.jpg",
          "greeting": "Good evening!",
          "suggestion": "Are you looking for an organic smoothie in TriBeCa?",
          "filters" : {
            "categoryId": "5354ca5c80e4b802000964cc",
            "neighborhoodGeoIds": "53e9465b487f0910f9f6cb44"
          }
        }))
      ]
    };
  });
