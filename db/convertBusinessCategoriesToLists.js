

var businesses = db.businesses.find().sort({"_id" : 1}).toArray();

for (var i = 0; i < businesses.length; i++) {
  var business = businesses[i];
  var catId = business.categoryId;
  var catTypeId = business.categoryTypeId;
  var catSubTypeId = business.categorySubTypeId;

  var categoryIds = [];
  var categoryTypeIds = [];
  var categorySubTypeIds = [];
  var expandedCatTypeId = null;
  var expandedCatSubTypeId = null;

  if (catId) {
    categoryIds = [catId];
    if (catTypeId) {
      expandedCatTypeId = catId + ':' + catTypeId;
      categoryTypeIds = [expandedCatTypeId];
      if (catSubTypeId) {
        expandedCatSubTypeId = expandedCatTypeId + ':' + catSubTypeId;
        categorySubTypeIds = [expandedCatSubTypeId];
      }
    }
  }

  business.categoryIds = categoryIds;
  business.categoryTypeIds = categoryTypeIds;
  business.categorySubTypeIds = categorySubTypeIds;

  delete business.categoryId;
  delete business.categoryTypeId;
  delete business.categorySubTypeId;

  db.businesses.save(business);
}

db.businesses.ensureIndex({"categoryIds": 1});
db.businesses.ensureIndex({"categoryTypeIds": 1});

