
// since this is only NYC as of 8/15/2014....

db.neighborhoods.remove({"stateCity": 'NY:new york'});

var geoNeighborhoods = db.neighborhoodGeo.find().toArray(),
  i,
  geoNeigh,
  stateCity,
  stateCityMap = {};

for (i = 0; i < geoNeighborhoods.length; i++) {
  geoNeigh = geoNeighborhoods[i];
  print("geoNeigh - " + geoNeigh.name);
  if (!geoNeigh.city) {
    print("geoNeigh has no city:\n" + JSON.stringify(geoNeigh, null, 3));
  }
  stateCity = "NY:" + geoNeigh.city.toLowerCase();
  if (!stateCityMap[stateCity]) {
    stateCityMap[stateCity] = [];
  }
  stateCityMap[stateCity].push(geoNeigh.geo_name);
}

for (var key in stateCityMap) {
  print("key: " + key);
}




