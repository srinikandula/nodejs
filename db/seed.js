db.beacons.ensureIndex({"loc" : "2dsphere"});
db.businesses.ensureIndex({"loc" : "2dsphere"});
db.businesses.ensureIndex({"name" : 1});
db.businesses.ensureIndex({"published" : 1});
db.businesses.ensureIndex({"createdAt" : -1});
db.businesses.ensureIndex({"categoryIds": 1});
db.businesses.ensureIndex({"categoryTypeIds": 1});
db.classifications.ensureIndex({"visible": 1});
db.classifications.ensureIndex({"name": 1}, {unique: true});
db.neighborhoods.ensureIndex({"stateCity": 1}, {unique: true});
db.neighborhoods.ensureIndex({"state": 1, "city": 1}, {unique: true});
db.neighborhoodGeo.ensureIndex({"geometry" : "2dsphere"});