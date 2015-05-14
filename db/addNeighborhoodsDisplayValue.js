
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();
var business = null;
var needsSaved = false;

for (var i = 0; i < businesses.length; i++) {
  business = businesses[i];
  needsSaved = false;

  if (business.neighborhoods && business.neighborhoods.length) {
    business.neighborhoodsDisplayValue = business.neighborhoods.sort().join(', ');
    needsSaved = true;
  }

  if (needsSaved) {
    db.businesses.save(business);
  }
}