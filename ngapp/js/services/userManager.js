"use strict";
/*global angular,_*/

var portalApp = angular.module('beaconApp');

portalApp.factory('userManager', function ($http, $log) {

  var GRP_READ_ONLY = "Read-only"
    , GRP_AUTHOR = "Author"
    , GRP_PUBLISHER = "Publisher"
    , GRP_ADMIN = "Admin"
    , GRP_DEVELOPER = "Developer"
    , GRP_BUSINESS_ADMIN = "Business Admin"
    , currentUser = null
    , currentGroups = null
    , hasRoleReadOnly = null
    , hasRoleAuthor = null
    , hasRolePublisher = null
    , hasRoleAdmin = null
    , hasRoleDeveloper = null
    , hasRoleBusinessAdmin = null;

  return {
    getCurrentUser: function (callback, forceRefresh) {
      if (currentUser === null || forceRefresh) {
        $http.get('/api/v1/user/me')
          .success(function (user) {
            currentUser = user;
            return angular.isFunction(callback) && callback(null, user);
          })
          .error(function (err, status) {
            $log.error('Error getting current user. Status code ' + status + ".  " + angular.toJson(err));
            //angular.isFunction(callback) && callback(err);
            document.location = "/"; // redirect to login
          });
      } else {
        return angular.isFunction(callback) && callback(null, currentUser);
      }
    },

    getGroupsForCurrentUser: function (callback, forceRefresh) {
      if (currentGroups === null || forceRefresh) {
        $http.get('/api/v1/user/groups')
          .success(function (groups) {
            currentGroups = groups.items;
            return angular.isFunction(callback) && callback(null, groups.items);
          })
          .error(function (err) {
            $log.error('Error getting current user\'s groups. ' + angular.toJson(err));
            return angular.isFunction(callback) && callback(err);
          });
      } else {
        return angular.isFunction(callback) && callback(null, currentGroups);
      }
    },

    isReadOnly: function () {
      if (hasRoleReadOnly === null && currentGroups) {
        hasRoleReadOnly = _.any(currentGroups, function (grp) {
          return GRP_READ_ONLY === grp.name;
        });
      }
      return hasRoleReadOnly;
    },

    isDeveloper: function () {
      if (hasRoleDeveloper === null && currentGroups) {
        hasRoleDeveloper = _.any(currentGroups, function (grp) {
          return GRP_DEVELOPER === grp.name;
        });
      }
      return hasRoleDeveloper;
    },

    isAuthor: function () {
      if (hasRoleAuthor === null && currentGroups) {
        hasRoleAuthor = _.any(currentGroups, function (grp) {
          return GRP_AUTHOR === grp.name;
        });
      }
      return hasRoleAuthor;
    },

    isPublisher: function () {
      if (hasRolePublisher === null && currentGroups) {
        hasRolePublisher = _.any(currentGroups, function (grp) {
          return GRP_PUBLISHER === grp.name;
        });
      }
      return hasRolePublisher;
    },

    isAdmin: function () {
      if (hasRoleAdmin === null && currentGroups) {
        hasRoleAdmin = _.any(currentGroups, function (grp) {
          return GRP_ADMIN === grp.name;
        });
      }
      return hasRoleAdmin;
    },

    isBusinessAdmin: function (businessId) {
      var isBusAdm = false;
      if (hasRoleBusinessAdmin === null && currentGroups) {
        hasRoleBusinessAdmin = _.any(currentGroups, function (grp) {
          return GRP_BUSINESS_ADMIN === grp.name;
        });
      }
      if (hasRoleBusinessAdmin) {
        if (businessId) {
          isBusAdm = currentUser && currentUser.customData && _.contains(currentUser.customData.businessIds, businessId);
        } else {
          isBusAdm = true;
        }
      }
      return isBusAdm;
    },

    canAddPOI: function () {
      return this.isAuthor() || this.isPublisher() || this.isAdmin();
    },

    canEditPOI: function (businessId) {
      return this.isPublisher() || this.isAdmin() || this.isBusinessAdmin(businessId);
    },

    canAddOrEditPOI: function (isAdd, businessId) {
      return isAdd ? this.canAddPOI() : this.canEditPOI(businessId);
    },

    canViewAPIDocs: function () {
      return this.isDeveloper() || this.isAdmin() || this.isPublisher() || this.isAuthor();
    },

    canViewBusinesses: function () {
      return this.isReadOnly() || this.isAuthor() || this.isPublisher() || this.isAdmin() || this.isBusinessAdmin();
    }
  };
});
