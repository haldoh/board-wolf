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
var router = require('express').Router();
var stat = require('../controllers/static');

router.route('/')
	// GET - default message
	.get(stat.defaultMessage);

module.exports = router;