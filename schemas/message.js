/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var mongoose = require('mongoose');

var Comment = mongoose.model('BoardComment');
var CommentSchema = require('./comment').schema;

// Schema for a board thread
var BoardMessageSchema = new mongoose.Schema({
	text: { type: String, required: true },
	time: { type: Date, 'default': Date.now },
	updated: { type: Date, 'default': Date.now },
	author: { type: String, required: true },
	upvotes: { type: Number, 'default': 0 },
	downvotes: { type: Number, 'default': 0 },
	comments: [CommentSchema],
	commentsNumber: { type: Number, 'default': 0 }
});

/*** MESSAGE ***/

BoardMessageSchema.methods.edit = function (text, thread, callback) {
	var time = new Date();
	this.text = (text ? text : this.text);
	this.updated = time;
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else {
			thread.updated = (thread.updated <= time ? time : thread.updated);
			thread.save(callback);
		}
	});
};

BoardMessageSchema.methods.upvote = function (prevVote, thread, callback) {
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
			thread.save(callback);
	});
};

BoardMessageSchema.methods.downvote = function (prevVote, thread, callback) {
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
			thread.save(callback);
	});
};

/*** COMMENTS ***/

BoardMessageSchema.methods.getComment = function (commentId) {
	return this.comments.id(commentId);
};

BoardMessageSchema.methods.newComment = function (text, author, thread, callback) {
	// Push new message
	var com = new Comment({
		text: text,
		author: author
	});
	this.comments.push(com);
	// Update time
	this.updated = com.time;
	// Update comments count
	this.commentsNumber += 1;
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else {
			// Update thread time
			thread.updated = (thread.updated <= com.time ? com.time : thread.updated);
			// Update thread comments number
			thread.commentsNumber += 1;
			// Save thread
			thread.save(function (err ,res) {
				if (err)
					callback(err, null);
				else
					callback(null, com);
			});
		}
	});
};

BoardMessageSchema.methods.editComment = function (commentId, text, thread, callback) {
	var com = this.comments.id(commentId);
	com.edit(text, thread, this, callback);
};

BoardMessageSchema.methods.removeComment = function (commentId, thread, callback) {
	this.comments.pull(commentId);
	this.commentsNumber -= 1;
	// Save changes
	this.save(function (cErr, cRes) {
		if (cErr)
			callback(cErr, null);
		else
			thread.save(callback);
	});
};

BoardMessageSchema.methods.upvoteComment = function (commentId, prevVote, thread, callback) {
	var com = this.comments.id(commentId);
	com.upvote(prevVote, thread, this, callback);
};

BoardMessageSchema.methods.downvoteComment = function (commentId, prevVote, thread, callback) {
	var com = this.comments.id(commentId);
	com.downvote(prevVote, thread, this, callback);
};

module.exports = mongoose.model('BoardMessage', BoardMessageSchema);

module.exports.schema = BoardMessageSchema;