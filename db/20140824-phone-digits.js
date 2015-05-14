var business = null;
var changeCount = 0;
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();

for (var i = 0; i < businesses.length; i++) {
  business = businesses[i];
  if (business.phone) {
    var newPhone = business.phone.replace(/\D/g,'');
    if (newPhone !== business.phone) {
      business.phone = newPhone;
      db.businesses.save(business);
      changeCount++;
    }
  }
}

print(businesses.length + " processed.  " + changeCount + " changed");
