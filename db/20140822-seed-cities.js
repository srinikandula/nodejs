

var city_new_york = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -73.959722,
      40.790278
    ]
  },
  "name": "New York",
  "geo_name": "New York",
  "city": "New York",
  "state": "NY",
  "level": 0,
  "position": 1,
  "path": "us-ny-newyork",
  "parent_path": "us-ny",
  "parent_name": "New York",
  "parentId": null
};


var city_los_angeles = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -118.2436849,
      34.0522342
    ]
  },
  "name": "Los Angeles",
  "geo_name": "Los Angeles",
  "city": "Los Angeles",
  "state": "CA",
  "level": 0,
  "position": 1,
  "path": "us-ca-los-angeles",
  "parent_path": "us-ca",
  "parent_name": "California",
  "parentId": null
};



var city_austin = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -97.74306079999997,
      30.267153
    ]
  },
  "name": "Austin",
  "geo_name": "Austin",
  "city": "Austin",
  "state": "TX",
  "level": 0,
  "position": 1,
  "path": "us-tx-austin",
  "parent_path": "us-tx",
  "parent_name": "Texas",
  "parentId": null
};



var city_seattle = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -122.3320708,
      47.6062095
    ]
  },
  "name": "Seattle",
  "geo_name": "Seattle",
  "city": "Seattle",
  "state": "WA",
  "level": 0,
  "position": 1,
  "path": "us-wa-seattle",
  "parent_path": "us-wa",
  "parent_name": "Washington",
  "parentId": null
};



var city_san_francisco = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -122.41941550000001,
      37.7749295
    ]
  },
  "name": "San Francisco",
  "geo_name": "San Francisco",
  "city": "San Francisco",
  "state": "CA",
  "level": 0,
  "position": 1,
  "path": "us-ca-san-francisco",
  "parent_path": "us-ca",
  "parent_name": "California",
  "parentId": null
};



var city_atlanta = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -84.3879824,
      33.7489954
    ]
  },
  "name": "Atlanta",
  "geo_name": "Atlanta",
  "city": "Atlanta",
  "state": "GA",
  "level": 0,
  "position": 1,
  "path": "us-ga-atlanta",
  "parent_path": "us-ga",
  "parent_name": "Georgia",
  "parentId": null
};



var city_chicago = {
  "geometry": {
    "type": "Point",
    "coordinates": [
      -87.62979819999998,
      41.8781136
    ]
  },
  "name": "Chicago",
  "geo_name": "Chicago",
  "city": "Chicago",
  "state": "IL",
  "level": 0,
  "position": 1,
  "path": "us-il-chicago",
  "parent_path": "us-il",
  "parent_name": "",
  "parentId": null
};


var seed_cities = [city_atlanta, city_austin, city_chicago, city_los_angeles, city_new_york, city_san_francisco, city_seattle];

seed_cities.forEach(function (city) {
  db.neighborhoodGeo.save(city);
});


var newYorkCityId = db.neighborhoodGeo.find({"level":0, "city":"New York"}, {"_id":1}).toArray()[0]._id.valueOf();

db.neighborhoodGeo.update({"state":"NY", "parentId": null, "level":1}, {$set : {"parentId":newYorkCityId} }, {multi:true});

