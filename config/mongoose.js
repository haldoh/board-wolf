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

var logger = require('./logger');
var config = require('./config');

// Mongoose config
module.exports = function () {

	// Connect to board db
	connect(config.mongo);

	return 0;
};

var connect = function (dbConf) {

	// MongoDB URI
	var uri = '';
	if (dbConf.fullUri)
		uri = dbConf.fullUri;
	else {
		if (dbConf.user && dbConf.password)
			uri = 'mongodb://' + dbConf.user + ':' + dbConf.password + '@' + dbConf.host + ':' + dbConf.port + '/' + dbConf.name;
		else
			uri = 'mongodb://' + dbConf.host + ':' + dbConf.port + '/' + dbConf.name;
	}

	// Define new DB connection
	var conn = mongoose.createConnection();

	// Connecting
	conn.on('connecting', function () {
		// Connected
		logger.info('Connecting to MongoDB database ' + dbConf.name + '...');
	});

	// Connected
	conn.on('connected', function () {
		// Connected
		logger.info('Connected to MongoDB database ' + dbConf.name);
	});

	// Manage errors
	conn.on('error', function (connErr) {

		// Log error
		logger.warn('MongoDB connection error: ' + connErr);

		// Reconnect
		conn = mongoose.createConnection();
		conn.open(uri);

		// Link models to correct DB
		dbSchemaLink(conn, dbConf.name);
	});

	// Connect
	conn.open(uri);

	// Link models to correct DB
	dbSchemaLink(conn, dbConf.name);
};

var dbSchemaLink = function (conn, dbName) {
	switch (dbName) {
		case 'board':

			// Cache databases refs
			mongoose.xBoard = conn.useDb('board');

			// Models
			require('../schemas/comment');
			require('../schemas/message');
			require('../schemas/thread');
			require('../schemas/user_vote');
			
			break;

		default:
			break;
	}
};