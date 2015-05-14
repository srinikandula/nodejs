
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();
var business = null, i;

var PENDING_NEIGHBORHOOD_NAME = '(PENDING)';

for (i = 0; i < businesses.length; i++) {
//  var businessId = businesses[i]._id.valueOf();
  business = businesses[i];
  if (!business.neighborhoods || business.neighborhoods.length === 0) {
    business.neighborhoods = [PENDING_NEIGHBORHOOD_NAME];
    db.businesses.save(business);
  }
}