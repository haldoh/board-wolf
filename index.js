/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the board-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Logger initialization
require('./config/logger').initialize();

// Connect to MongoDB and setup mongoose
require('./config/mongoose')();

// Create app
var app = require('./config/express')();

module.exports = app;