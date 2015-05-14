
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();
var business = null;

var defaultImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg";
var defaultImageSecureURL = "https://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg";
var defaultWidth = 640;
var defaultHeigh = 360;
var createdAt = new Date();

for (var i = 0; i < businesses.length; i++) {
  var businessId = businesses[i]._id.valueOf();

  var images = db.busImages.find({"businessId": businessId}).toArray();
  if (images === null || images.length === 0) {
    var defaultImage = {
      businessId: businessId,
      format: 'jpg',
      resource_type: 'image',
      created_at: createdAt,
      url: defaultImageURL,
      secureUrl: defaultImageSecureURL,
      name: 'Default',
      description: 'Default image for POI',
      width: defaultWidth,
      height: defaultHeigh,
      is_system_default: true
    };
    db.busImages.save(defaultImage);
  }

}