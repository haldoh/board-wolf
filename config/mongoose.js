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
var mongoose = require('mongoose');

var logger = require('./logger.js');
var config = require('./config.js');

// Mongoose config
module.exports = function () {

	// Schemas

	return connect();
};

var connect = function () {

	return mongoose.connect(config.mongo.uri, function (err) {
		if (err) {
			logger.warn('Error connecting to MongoDB - retrying in 5secs: ' + err);
			setTimeout(connect, 5000);
		} else {
			// Connected
			logger.info('Connected to MongoDB database.');
		}
	});
};