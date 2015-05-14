var businesses = db.businesses.find().sort({"_id": 1}).toArray();
var business = null, i, j, neighborhoodResults, neighborhoods, neighGeo, neighGeoIds, nynyNeighObj, nynyNeighs = [];


nynyNeighObj = db.neighborhoods.find({"stateCity": "NY:new york"}).toArray() || [];
if (nynyNeighObj.length > 0) {
  nynyNeighObj = nynyNeighObj[0];
  nynyNeighs = nynyNeighObj.neighborhoods || [];
}

print("Existing nynyNeighs: " + JSON.stringify(nynyNeighs));

for (i = 0; i < businesses.length; i++) {
  neighborhoodResults = null;
  neighborhoods = [];
  neighGeo = null;
  neighGeoIds = [];
  business = businesses[i];
  if (business.loc && business.loc.coordinates && business.loc.coordinates.length === 2) {
    neighborhoodResults = db.neighborhoodGeo.find({ "geometry": { $geoIntersects: { $geometry: { type: "Point", coordinates: business.loc.coordinates}}}}).sort({"level" : -1}).toArray();
    if (neighborhoodResults && neighborhoodResults.length > 0) {
      for (j = 0; j < neighborhoodResults.length; j++) {
        neighGeo = neighborhoodResults[j];
        if (j === 0) {
          neighborhoods = [neighGeo.geo_name];
          if (nynyNeighs.indexOf(neighGeo.geo_name) === -1) {
            nynyNeighs.push(neighGeo.geo_name);
            nynyNeighs.sort();
          }
        }
        neighGeoIds.push(neighGeo._id.valueOf());
      }
      var oldNeigh = business.neighborhoods && business.neighborhoods.length > 0 ? " old - (" + JSON.stringify(business.neighborhoods) + ') ' : '';
      business.neighborhoods = neighborhoods;
      business.neighborhoodGeoIds = neighGeoIds;
      print(business.name + ": " + oldNeigh + JSON.stringify(neighborhoods) + " - " + JSON.stringify(neighGeoIds));
      db.businesses.save(business);
    }
  }

}

print("nynyNeighs - " + nynyNeighs);
print("nynyNeighObj.neighborhoods - " + nynyNeighObj.neighborhoods);
if (nynyNeighObj) {
  nynyNeighObj.neighborhoods = nynyNeighs;
  db.neighborhoods.save(nynyNeighObj);
}

