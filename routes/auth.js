"use strict";

//var express = require('express');
//var router = express.Router();
var passport = require('passport')
  , stormpath = require('stormpath')
  , util = require('util')
  , RequestUtils = require('../lib/requestUtils')
  , _ = require('underscore')
  , businessDAO = require('../lib/dao/businessDAO')
  , JSONResponseUtils = require('../lib/jsonResponseUtils')
  , stormpathClient = null;


function getRegViewParams(req, email, firstName, lastName, error) {
  return {
    title: 'Register',
    error: error || req.flash('error')[0],
    firstName: firstName || '',
    lastName: lastName || '',
    email: email || ''
  };
}

exports.getRegistrationView = function (db) {
  // Render the registration page.
  return function (req, res) {
    res.render('register', getRegViewParams(req));
  };
};

var getStormpathClient = function () {
  if (stormpathClient !== null) {
    return stormpathClient;
  }
  // Initialize our Stormpath client.
  var apiKey = new stormpath.ApiKey(
    process.env.STORMPATH_API_KEY_ID,
    process.env.STORMPATH_API_KEY_SECRET
  );
  stormpathClient = new stormpath.Client({ apiKey: apiKey });
  return stormpathClient;
};

exports.submitRegistration = function (db) {
  // Render the registration page.
  return function (req, res) {

    var username = req.body.username
      , password = req.body.password
      , firstName = RequestUtils.getFieldIfExists('firstName', req)
      , lastName = RequestUtils.getFieldIfExists('lastName', req)
      , apiKey, spClient;

    // Grab user fields.
    if (!username || !password || !firstName || !lastName) {
      return res.render('register',
        getRegViewParams(req, username, firstName, lastName, 'All fields are required.'));
    }

    spClient = getStormpathClient();

    // Grab our app, then attempt to create this user's account.
    spClient.getApplication(process.env.STORMPATH_URL, function (err, spApp) {
      if (err) {
        console.log("error getting sp app. " + util.inspect(err));
        throw err;
      }

      spApp.createAccount({
        givenName: firstName,
        surname: lastName,
        username: username,
        email: username,
        password: password
      }, function (err, createdAccount) {
        if (err) {
          console.log(util.log(util.format('Error creating account: %s', util.inspect(err))));
          var opts = getRegViewParams(req, username, firstName, lastName, err.userMessage);
          return res.render('register', opts);
        }
        console.log(util.log(util.format('New account created: %s', util.inspect(createdAccount))));
        passport.authenticate('stormpath')(req, res, function () {
          return res.redirect('/console');
        });
      });
    });
  };
};

exports.getLoginView = function (db) {
  // Render the login page.
  return function (req, res) {
    res.render('login', {title: 'Login', error: req.flash ? req.flash('error')[0] : ''});
  };
};


exports.logout = function (db) {
  return function (req, res) {
    req.logout();
    res.redirect('/');
  };
};


exports.getForgotPasswordView = function (db) {
  return function (req, res) {
    res.render('forgotPassword', {title: 'Forgot Password', error: req.flash ? req.flash('error')[0] : ''});
  };
};


exports.submitForgotPassword = function (db) {
  return function (req, res) {
    var spClient = getStormpathClient()
      , email = RequestUtils.getFieldIfExists('email', req);

    if (!email) {
      return res.render('forgotPassword', {title: 'Forgot Password', error: 'Email cannot be blank'});
    }

    spClient.getApplication(process.env.STORMPATH_URL, function (err, spApp) {
      if (err) {
        return res.render('forgotPassword', {title: 'Forgot Password', error: err});
      }

      spApp.sendPasswordResetEmail(email, function (error, passwordResetToken) {
        if (error) {
          return res.render('forgotPassword', {title: 'Forgot Password', error: err});
        }
        console.log(passwordResetToken);
        //the passwordResetToken indicates to which account the email was sent:
        console.log(passwordResetToken.account);
        res.render('forgotPasswordEmailSent', {title: 'Password Reset Successful', error: (req.flash ? req.flash('error')[0] : '')});
      });
    });
  };
};

exports.home = function (db) {
  return function (req, res) {
    if (RequestUtils.isLoggedIn(req)) {
      return res.redirect('/console');
    }
    res.render('login', {title: 'Login', error: (req.flash ? req.flash('error')[0] : '')});
  };
};

exports.getAccounts = function (db) {
  return function (req, res) {
    var spClient = getStormpathClient();

    // Grab our app, then attempt to create this user's account.
    spClient.getApplication(process.env.STORMPATH_URL, function (err, spApp) {
      if (err) {
        console.log("error getting sp app. " + util.inspect(err));
        throw err;
      }
      RequestUtils.performIfAdmin(req, res, function () {
        spApp.getAccounts({expand: 'customData'}, function (error, accounts) {
          if (error) {
            RequestUtils.errorResponse(res, "Error getting accounts. " + error);
          } else {
            businessDAO.findBusinessesMinimal(db, function (busMinErr, minBusList) {
              if (busMinErr) {
                RequestUtils.errorResponse(res, "Error getting business data as part of retrieving all account info. " + busMinErr);
                return;
              }
              _.each(minBusList, function (b) { JSONResponseUtils.replaceIdField(b); });
              var busCache = _.indexBy(minBusList, 'id');
              _.each(accounts.items, function (account) {
                account.businesses = [];
                if (account.customData && !_.isEmpty(account.customData.businessIds)) {
                  _.each(account.customData.businessIds, function (busId) {
                    if (busCache[busId]) {
                      account.businesses.push(busCache[busId].name);
                    }
                  });
                }
              });
              res.json(accounts.items);
            });
          }
        });
      });
    });
  };
};


exports.getAccount = function (db) {
  return function (req, res) {
    var spClient = getStormpathClient();
    RequestUtils.performIfAdmin(req, res, function () {
      var href = RequestUtils.getFieldIfExists('href', req);
      if (!href) {
        RequestUtils.errorResponse(res, "'href' was not specified.");
        return;
      }
      spClient.getAccount(href, {expand: 'customData,groups'}, function (error, account) {
        if (error) {
          RequestUtils.errorResponse(res, "Error getting account. " + error);
        } else {
          console.log("Account: " + util.inspect(account));
          if (account.groups && !_.isEmpty(account.groups.items)) {
            account.groupNames = _.map(account.groups.items, function (val) { return val.name; });
          }
          res.json(account);
        }
      });
    });
  };
};

exports.saveAccountCustomData = function (db) {
  return function (req, res) {
    console.log("saving account custom data...");
    var spClient = getStormpathClient();
    RequestUtils.performIfAdmin(req, res, function () {
      var href = RequestUtils.getFieldIfExists('accountHref', req);
      if (!href) {
        RequestUtils.errorResponse(res, "'accountHref' was not specified.");
        return;
      }
      spClient.getAccount(href, {expand: 'customData'}, function (error, account) {
        if (error) {
          RequestUtils.errorResponse(res, "Error getting account. " + error);
        } else {
          console.log("Account: " + util.inspect(account));
          account.getCustomData(function (cdErr, customData) {
            if (cdErr) {
              RequestUtils.errorResponse(res, "Error getting custom data for account. " + cdErr);
              return;
            }
            customData.businessIds = RequestUtils.getFieldIfExists('businessIds', req);
            if (!customData.businessIds) {
              RequestUtils.errorResponse(res, "'businessIds' was not specified.");
              return;
            }
            customData.save(function (cdSaveErr) {
              if (cdSaveErr) {
                RequestUtils.errorResponse(res, "Error saving custom data for account. " + cdSaveErr);
                return;
              }
              res.json(account);
            });
          });
        }
      });
    });
  };
};