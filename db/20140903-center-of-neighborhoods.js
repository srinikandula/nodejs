var allNeighborhoodsWithPolygons = db.neighborhoodGeo.find({"geometry.type": "Polygon"}).toArray();

allNeighborhoodsWithPolygons.forEach(function (neighborhoodGeo, i) {
  var minLat = null, minLon = null, maxLat = null, maxLon = null, centerLat = null, centerLon = null;
  var numOfPolygons = neighborhoodGeo.geometry.coordinates.length;
  if (numOfPolygons !== 1) {
    print(neighborhoodGeo.name + " has " + numOfPolygons + " polygons!  Not processing it!");
  } else {
    neighborhoodGeo.geometry.coordinates[0].forEach(function (ll) {
      var lon = ll[0];
      var lat = ll[1];
      if (minLon === null || lon < minLon) {
        minLon = lon;
      }
      if (maxLon === null || lon > maxLon) {
        maxLon = lon;
      }
      if (minLat === null || lat < minLat) {
        minLat = lat;
      }
      if (maxLat === null || lat > maxLat) {
        maxLat = lat;
      }
    });
    centerLat = (minLat + maxLat) / 2.0;
    centerLon = (minLon + maxLon) / 2.0;
    print("------------------------------------------------------------------------------------------------------------");
    print(neighborhoodGeo.name + ":\n  minLat: " + minLat + ", maxLat: " + maxLat + "\n  minLon: " + minLon + ", maxLon: " + maxLon);
    print("     center lat / lon: " + centerLat + ", " + centerLon + "\n");

    db.neighborhoodGeo.update({"_id": neighborhoodGeo._id},
      {$set: {
        "centerLat": centerLat,
        "centerLon": centerLon,
        "maxLat": maxLat,
        "maxLon": maxLon,
        "minLat": minLat,
        "minLon": minLon}});
  }

});
