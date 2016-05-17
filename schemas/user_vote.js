/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var mongoose = require('mongoose');

// Schema for a board thread
var UserVoteSchema = new mongoose.Schema({
	user: { type: String, required: true, index: true },
	content: { type: String, required: true, index: true },
	vote: { type: Number, required: true }
});

module.exports = mongoose.model('UserVote', UserVoteSchema);