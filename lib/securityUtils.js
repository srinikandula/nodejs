'use strict';

var _ = require('underscore')
  , util = require('util')
  , GRP_ADMIN = "Admin"
  , GRP_AUTHOR = "Author"
  , GRP_BUSINESS_ADMIN = "Business Admin"
  , GRP_DEVELOPER = "Developer"
  , GRP_PUBLISHER = "Publisher"
  , GRP_READ_ONLY = "Read-only";

var SecurityUtils = {
  ROLES: {
    ADMIN: GRP_ADMIN,
    AUTHOR: GRP_AUTHOR,
    BUSINESS_ADMIN: GRP_BUSINESS_ADMIN,
    DEVELOPER: GRP_DEVELOPER,
    PUBLISHER: GRP_PUBLISHER,
    READ_ONLY: GRP_READ_ONLY
  },
  canViewPublishedFlag: function (req) {
    return true;
  },
  hasRole: function (req, roleName) {
    if (roleName && _.isString(roleName) && req && req.user && req.user.groups && req.user.groups.items && _.isArray(req.user.groups.items)) {
      return _.any(req.user.groups.items, function (val) {
        return val.name === roleName;
      });
    }
    return false;
  },
  hasAnyRole: function (req, roleNames) {
    if (roleNames && _.isArray(roleNames) && req && req.user && req.user.groups && req.user.groups.items && _.isArray(req.user.groups.items)) {
      return _.any(req.user.groups.items, function (val) {
        return _.contains(roleNames, val.name);
      });
    }
    return false;
  },
  hasOnlyRole: function (req, roleName) {
    return roleName && _.isString(roleName) && req && req.user && req.user.groups && req.user.groups.items && _.isArray(req.user.groups.items) && req.user.groups.items.length === 1 && req.user.groups.items[0].name === roleName;
  },
  canEditBusiness: function (req, businessId) {
    var isAdminOrPublisher = SecurityUtils.hasAnyRole(req, [GRP_ADMIN, GRP_PUBLISHER])
    , isBusinessAdmin = SecurityUtils.hasRole(req, GRP_BUSINESS_ADMIN)
    , isAssociatedWithBusiness = _.contains(req.user.customData.businessIds, businessId);
    return isAdminOrPublisher || (isBusinessAdmin && isAssociatedWithBusiness);
  }
};

module.exports = SecurityUtils;