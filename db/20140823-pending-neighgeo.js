
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();
var business = null;

for (var i = 0; i < businesses.length; i++) {
  business = businesses[i];

  if (!business.neighborhoodGeoIds || business.neighborhoodGeoIds.length === 0) {
    business.neighborhoodGeoIds = ["(PENDING)"];
    db.businesses.save(business);
  }
}