
var businesses = db.businesses.find({"zip":/NY/}).toArray();
var business = null;

for (var i = 0; i < businesses.length; i++) {
  business = businesses[i];
  var originalVal = business.zip;
  if (business.zip) {
    business.zip = business.zip.replace('NY ', '');
  }
  if (originalVal !== business.zip) {
    db.businesses.save(business);
  }
}