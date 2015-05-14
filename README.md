# Get Well / Ishiki


## Directory Structure
 
There are 2 parts to this app -- the node.js server app and then the web admin portal (written in angular.js).

### Node.js (server-side)
 1. /app.js  -- main server file, defines all of the REST API routes
 2. /lib  -- misc helper code
 3. /routes  -- contains the code that handles the requests, gets the parameters, and makes the database calls
 
### Admin Portal (angular.js)

 1. /ngapp  -- root of the angular.js admin portal
 2. /ngapp/index.html  -- portal home page
 3. /ngapp/partials  -- angular partials for each screen
 4. /ngapp/js -- root of the angular code (controllers, directives, services)
 5. /ngapp/js/controllers -- contains that code that makes the ajax queries for getting data or posting to the server


## Environment Variables

 * CATEGORY_EAT_ID - database id of the 'eat' category
 * CATEGORY_MOVE_ID - database id of the 'move' category
 * CATEGORY_HEAL_ID - database id of the 'heal' category
 * DEFAULT_EAT_IMAGE_INFO - a pipe-delimited string of the format:  URL|width|height
 * DEFAULT_MOVE_IMAGE_INFO - a pipe-delimited string of the format:  URL|width|height
 * DEFAULT_HEAL_IMAGE_INFO - a pipe-delimited string of the format:  URL|width|height
 * EXPRESS_SECRET - a random string -- anything you like
 * POIVIEW_BASE_URL - (optional) the base URL that will be used for links to the POI details view, used for sharing.  e.g. http://poi.getwellcities.com
 * CLOUDINARY_POI_IMG_XFORM - a string with cloudinary xform parameters.  e.g. c_scale,w_960
 * CLOUDINARY_URL - _(automatically set by heroku)_
 * MONGOLAB_URI - _(automatically set by heroku)_
 * STORMPATH_API_KEY_ID - _(automatically set by heroku)_
 * STORMPATH_API_KEY_SECRET - _(automatically set by heroku)_
 * STORMPATH_URL - _(automatically set by heroku)_

 
 