/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the auth-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

var winston = require('winston');
require('winston-loggly');

var config = require('./config.js');

var levels = [
	'DEBUG', 'INFO', 'WARN', 'ERROR'
];

var logger = null;

// Logger initialization
module.exports.initialize = function () {
	if (config.loggly) {

		// Create new logger with appropriate transports
		logger = new winston.Logger({
			transports: [
				new winston.transports.Loggly(config.loggly),
				new winston.transports.Console({
					level: 'debug',
					handleExceptions: true,
					humanReadableUnhandledException: true,
					json: false,
					colorize: true
				})
			],
			exitOnError: true
		});
	} else {

		// Create new logger with appropriate transports
		logger = new winston.Logger({
			transports: [
				new winston.transports.Console({
					level: 'debug',
					// handleExceptions: true,
					json: false,
					colorize: true
				})
			],
			exitOnError: true
		});
	}

	// Custom stream for morgan
	logger.stream = {
		write: function (message, encoding) {
			logger.info(message);
		}
	};

};

// Custom logging levels
levels.forEach(function (level) {
	module.exports[level.toLowerCase()] = function (content) {

		// Log to console the message
		logger.log(level.toLowerCase(), content);
	};
});