/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var mongoose = require('mongoose');

// Schema for a board thread
var BoardCommentSchema = new mongoose.Schema({
	text: { type: String, required: true },
	time: { type: Date, 'default': Date.now },
	author: { type: String, required: true },
	upvotes: { type: Number, 'default': 0 },
	downvotes: { type: Number, 'default': 0 },
});

BoardCommentSchema.methods.edit = function (text, thread, message, callback) {
	var time = new Date();
	this.text = (text ? text : this.text);
	this.updated = time;
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else {
			message.updated = (message.updated <= time ? time : message.updated);
			message.save(function (cErr2, cRes2) {
				if (cErr)
					callback(cErr2, null);
				else {
					thread.updated = (thread.updated <= time ? time : thread.updated);
					thread.save(callback);
				}
			});
		}
	});
};

BoardCommentSchema.methods.upvote = function (prevVote, thread, message, callback) {
	if (prevVote === null) {
		this.upvotes += 1;
	} else if (prevVote.vote === -1) {
		this.upvotes += 1;
		this.downvotes -= 1;
	}
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else
			message.save(function (cErr2, cRes2) {
				if (cErr)
					callback(cErr2, null);
				else
					thread.save(callback);
			});
	});
};

BoardCommentSchema.methods.downvote = function (prevVote, thread, message, callback) {
	if (prevVote === null) {
		this.downvotes += 1;
	} else if (prevVote.vote === 1) {
		this.downvotes += 1;
		this.upvotes -= 1;
	}
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else
			message.save(function (cErr2, cRes2) {
				if (cErr)
					callback(cErr2, null);
				else
					thread.save(callback);
			});
	});
};

module.exports = mongoose.model('BoardComment', BoardCommentSchema);

module.exports.schema = BoardCommentSchema;