/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the board-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

var endpoint = {
	local: 'http://192.168.0.8:3000',
	heroku: 'https://board-wolf.herokuapp.com'
};

// Configuration object
var config = {

	// Local configuration parameters
	local: {
		mode: 'local',
		endpoint: endpoint.local,
		port: 3100,
		jwtSecret: 'localJwtSecret',
		morgan: 'REQ :remote-addr - :remote-user  ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time',
		token: 'localhost_web_token',
		auth: {
			endpoint: 'http://localhost:3000',
			platform: 'web-wolf',
			token: 'localhost_web_token'
		},
		mongo: {
			uri: 'mongodb://localhost:27017/board',
			name: 'board'
		}
	},

	// Heroku configuration parameters
	heroku: {
		mode: 'heroku',
		endpoint: endpoint.heroku,
		port: process.env.PORT,
		jwtSecret: process.env.JWT_SECRET,
		morgan: 'REQ :remote-addr - :remote-user  ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time',
		token: process.env.AUTH_TOKEN,
		auth: {
			endpoint: 'https://auth-wolf.herokuapp.com',
			platform: process.env.PLATFORM,
			token: process.env.AUTH_TOKEN
		},
		mongo: {
			uri: process.env.MONGOLAB_URI,
			name: 'board'
		}
	}
};

// Return the correct configuration parameters based on environment
module.exports = process.env.NODE_ENV ? config[process.env.NODE_ENV] : config.local;