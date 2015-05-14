/*
 *  This script will iterate through all businesses in the database, check to see
 *  if they need a default image added, and if so, add it.  If the business already
 *  has only the system default image, it is deleted first.  Also, the new system
 *  default image will only be added *if* the business belongs to one of Eat/Move/Heal.
 */
var businesses = db.businesses.find().sort({"_id" : 1}).toArray();

//DEFAULT_EAT_IMAGE_INFO=http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/eat_bzouxj.jpg|960|657
//DEFAULT_MOVE_IMAGE_INFO=http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/move_nlzgdq.jpg|960|643
//DEFAULT_HEAL_IMAGE_INFO=http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/heal_ypz1yz.jpg|960|640

var eatImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/eat_bzouxj.jpg";
var moveImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/move_nlzgdq.jpg";
var healImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1412364501/heal_ypz1yz.jpg";
var eatImageWidth = 960;
var eatImageHeight = 657;
var moveImageWidth = 960;
var moveImageHeight = 643;
var healImageWidth = 960;
var healImageHeight = 640;

// production ids
var eatId = "5354ca6180e4b802000964cd";
var moveId = "53a36c5e215c340200433971";
var healId = "5354ca5c80e4b802000964cc";

// localhost ids
//var eatId = "5352f7660be2c70e5a8f5834";
//var moveId = "53548dc48b1ed93c9866eb07";
//var healId = "53548d668b1ed93c9866eb01";

//var defaultImageURL = "http://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg";
//var defaultImageSecureURL = "https://res.cloudinary.com/hbab5hodz/image/upload/v1407785506/sunflowers640_epdz4y.jpg";
//var defaultWidth = 640;
//var defaultHeigh = 360;
var createdAt = new Date();

for (var i = 0; i < businesses.length; i++) {
  var business = businesses[i];
  var businessId = business._id.valueOf();

  var images = db.busImages.find({"businessId": businessId}).toArray();
  var needsDefault = false;
  if (images && images.length === 1 && images[0].is_system_default) {
    db.busImages.remove(images[0]);
    needsDefault = true;
  }
  if (images === null || images.length === 0) {
    needsDefault = true;
  }
  if (needsDefault) {
    var isEat = business.categoryIds && business.categoryIds.indexOf(eatId) !== -1;
    var isMove = business.categoryIds && business.categoryIds.indexOf(moveId) !== -1;
    var isHeal = business.categoryIds && business.categoryIds.indexOf(healId) !== -1;
    var defaultImageURL = null;
    var defaultWidth = null;
    var defaultHeight = null;
    var catName = "";
    if (isEat) {
      defaultImageURL = eatImageURL;
      catName = "Eat";
      defaultWidth = eatImageWidth;
      defaultHeight = eatImageHeight;
    } else if (isMove) {
      defaultImageURL = moveImageURL;
      catName = "Move";
      defaultWidth = moveImageWidth;
      defaultHeight = moveImageHeight;
    } else if (isHeal) {
      defaultImageURL = healImageURL;
      catName = "Heal";
      defaultWidth = healImageWidth;
      defaultHeight = healImageHeight;
    }
    if (isEat || isMove || isHeal) {
      var defaultImage = {
        businessId: businessId,
        format: 'jpg',
        resource_type: 'image',
        created_at: createdAt,
        url: defaultImageURL,
        name: 'Default',
        description: "Default image for the category '" + catName + "'",
        width: defaultWidth,
        height: defaultHeight,
        is_system_default: true
      };
      db.busImages.save(defaultImage);
    }
  }
}
