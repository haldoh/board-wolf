/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var mongoose = require('mongoose');

var Message = mongoose.xBoard.model('BoardMessage');
var MessageSchema = require('./message').schema;

// Schema for a board thread
var BoardThreadSchema = new mongoose.Schema({
	title: { type: String, required: true },
	text: { type: String, required: true },
	author: { type: String, required: true },
	time: { type: Date, 'default': Date.now },
	updated: { type: Date, index: true, 'default': Date.now },
	upvotes: { type: Number, 'default': 0 },
	downvotes: { type: Number, 'default': 0 },
	messages: [MessageSchema],
	messagesNumber: { type: Number, 'default': 0 },
	commentsNumber: { type: Number, 'default': 0 }
});

/*** THREAD ***/

BoardThreadSchema.methods.edit = function (title, text, callback) {
	// Update fields if new value was given
	this.title = (title ? title : this.title);
	this.text = (text ? text : this.text);
	// Update time
	this.updated = new Date();
	// Save changes
	this.save(callback);
};

BoardThreadSchema.methods.upvote = function (prevVote, callback) {
	if (prevVote === null) {
		this.upvotes += 1;
	} else if (prevVote.vote === -1) {
		this.upvotes += 1;
		this.downvotes -= 1;
	}
	this.save(callback);
};

BoardThreadSchema.methods.downvote = function (prevVote, callback) {
	if (prevVote === null) {
		this.downvotes += 1;
	} else if (prevVote.vote === 1) {
		this.downvotes += 1;
		this.upvotes -= 1;
	}
	this.save(callback);
};

/*** MESSAGES ***/

BoardThreadSchema.methods.getMessage = function (messageId) {
	return this.messages.id(messageId);
};

BoardThreadSchema.methods.newMessage = function (text, author, callback) {
	// Push new message
	var msg = new Message({
		text: text,
		author: author
	});
	var pos = this.messages.push(msg);
	// Set update time
	this.updated = msg.time;
	// Update message count
	this.messagesNumber += 1;
	// Save changes
	this.save(function (err, res) {
		if (err)
			callback(err, null);
		else
			callback(null, msg);
	});
};

BoardThreadSchema.methods.editMessage = function (messageId, text, callback) {
	var msg = this.messages.id(messageId);
	msg.edit(text, this, callback);
};

BoardThreadSchema.methods.removeMessage = function (messageId, callback) {
	this.messages.pull(messageId);
	this.messagesNumber -= 1;
	this.save(callback);
};

BoardThreadSchema.methods.upvoteMessage = function (messageId, prevVote, callback) {
	var msg = this.messages.id(messageId);
	msg.upvote(prevVote, this, callback);
};

BoardThreadSchema.methods.downvoteMessage = function (messageId, prevVote, callback) {
	var msg = this.messages.id(messageId);
	msg.downvote(prevVote, this, callback);
};

/*** COMMENTS ***/

BoardThreadSchema.methods.getComment = function (messageId, commentId) {
 return this.messages.id(messageId).getComment(commentId);
};

BoardThreadSchema.methods.newComment = function (messageId, text, author, callback) {
	var msg = this.messages.id(messageId);
	msg.newComment(text, author, this, callback);
};

BoardThreadSchema.methods.editMessage = function (messageId, commentId, text, callback) {
	var msg = this.messages.id(messageId);
	msg.editComment(commentId, text, this, callback);
};

BoardThreadSchema.methods.removeComment = function (messageId, commentId, callback) {
	var msg = this.messages.id(messageId);
	msg.removeComment(commentId, this, callback);
};

BoardThreadSchema.methods.upvoteComment = function (messageId, commentId, prevVote, callback) {
	var msg = this.messages.id(messageId);
	msg.upvoteComment(commentId, prevVote, this, callback);
};

BoardThreadSchema.methods.downvoteComment = function (messageId, commentId, prevVote, callback) {
	var msg = this.messages.id(messageId);
	msg.downvoteComment(commentId, prevVote, this, callback);
};

module.exports = mongoose.xBoard.model('BoardThread', BoardThreadSchema);