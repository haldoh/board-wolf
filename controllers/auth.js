/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the voip-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires

var auth = require('../models/auth');

var config = require('../config/config');
var logger = require('../config/logger');
var error = require('../config/error');

/* Check API request token
 */
module.exports.checkApiToken = function (req, res, next) {

	// Try to get headers required for calls
	var platform = req.headers.hasOwnProperty('x-wolf-platform') ? req.headers['x-wolf-platform'] : -1;
	var token = req.headers.hasOwnProperty('x-wolf-token') ? req.headers['x-wolf-token'] : -1;

	// Check token
	if (platform !== -1 && token !== -1 && token === config.token) {
		logger.debug('Request authorized from platform ' + platform);
		return next();
	} else
		return error.send('401', '3', 'warn', res, 'controllers.auth.checkApiToken', 'API tokens failed to validate: ' + JSON.stringify(req.headers));
};

/* Check user request token
 */
module.exports.checkUserToken = function (req, res, next) {

	// Try to get headers required for calls
	var userToken = req.headers.hasOwnProperty('x-wolf-user-token') ? req.headers['x-wolf-user-token'] : -1;

	// Check token
	if (userToken === -1)
		return error.send('400', '1', 'warn', res, 'controllers.user.checkUserToken', 'Parameter missing from call: ' + JSON.stringify(req.headers));
	else {

		// Check token
		return auth.verifyUserToken(userToken, function (tokenErr, decodedToken) {
			if (tokenErr)
				return error.send('401', '2', 'warn', res, 'controllers.user.checkUserToken', 'Token verification failed: ' + JSON.stringify(tokenErr));
			else {

				// Token valid, go ahead
				logger.debug('Request authorized from user ' + decodedToken.id);
				req.tokenUser = decodedToken;
				return next();
			}
		});
	}
};