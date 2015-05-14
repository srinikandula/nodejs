
## Opentable data

example curl command to get opentable data:

curl "http://opentable.herokuapp.com/api/restaurants?state=NY&city=New%20York&page=17&per_page=100" | tee newyork-17.json



## Importing


mongoimport --db medbeaconDB --collection businesses --file exported-newyork-localhost.json