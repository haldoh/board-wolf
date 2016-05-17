/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the board-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var request = require('request');

var config = require('../config/config');

// Get users data given an array of IDs
module.exports.getByIds = function (userIds, token, callback) {
	return authCall('/users/list', 'POST', token, null, {ids: userIds.join(',')}, callback);
};

/*** PRIVATE FUNCTIONS ***/

// Basic template for calls to the auth layer
var authCall = function (path, method, token, cookieJar, data, callback) {

	// Configure request options
	var options = {
		url: config.auth.endpoint + path,
		method: method,
		followAllRedirects: true,
		headers: {
			'x-wolf-auth-platform': config.auth.platform,
			'x-wolf-auth-token': config.auth.token
		}
	};

	// Add form data if needed
	if (method === 'POST' || method === 'PUT')
		options.form = data;

	// Add cookie jar if needed
	if (cookieJar)
		options.jar = cookieJar;

	// Add user token if given
	if (token)
		options.headers['x-wolf-user-token'] = token;

	// Call auth layer
	return request(options, callback);
};