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
var jwt = require('jsonwebtoken');

var config = require('../config/config');

// Verify a user token
module.exports.verifyUserToken = function (token, callback) {

	// Secret
	var secret = config.jwtSecret;

	// Options
	var options = {};

	// Verify token
	jwt.verify(token, secret, options, callback);
};