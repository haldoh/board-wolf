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
var logger = require('../config/logger');
var errors = require('../config/error');

var User = require('../models/user');

var BoardThread = require('mongoose').model('BoardThread');
var UserVote = require('mongoose').model('UserVote');

/*** MIDDLEWARE ***/

// Check if a user as already upvoted/downvoted a thread
module.exports.checkThreadVote = function (req, res, next) {
	checkVote(req.tokenUser.id, req.params.threadid, req, res, next);
};

// Check if a user as already upvoted/downvoted a message
module.exports.checkMessageVote = function (req, res, next) {
	checkVote(req.tokenUser.id, req.params.messageid, req, res, next);
};

// Check if a user as already upvoted/downvoted a comment
module.exports.checkCommentVote = function (req, res, next) {
	checkVote(req.tokenUser.id, req.params.commentid, req, res, next);
};

// Check if a user as already upvoted/downvoted a content
var checkVote = function (userId, contentId, req, res, next) {
	UserVote.findOne({
		user: userId,
		content: contentId
	}, function (checkErr, checkRes) {
		if (checkErr)
			errors.send('500', '1', 'warn', res, 'controllers.board.checkVote', 'Check user vote error: ' + checkErr);
		else if (!checkRes) {
			// No vote found for the user/content couple
			req.previousVote = null;
			next();
		} else {
			// Previous vote found for the user/content couple - pass it on to the next call
			req.previousVote = checkRes;
			next();
		}
	});
};

// Check if user owns a thread
module.exports.userOwnsThread = function (req, res, next) {
	if (req.thread.author === req.tokenUser.id)
		next();
	else
		errors.send('Unauthorized', 'debug', res, 'User does not own the thread.');
};

// Check if user owns a message
module.exports.userOwnsMessage = function (req, res, next) {
	var msg = req.thread.getMessage(req.params.messageid);
	if (msg.author === req.tokenUser.id)
		next();
	else
		errors.send('Unauthorized', 'debug', res, 'User does not own the message.');
};

// Check if user owns a comment
module.exports.userOwnsComment = function (req, res, next) {
	var com = req.thread.getMessage(req.params.messageid).getComment(req.params.commentid);
	if (com.author === req.tokenUser.id)
		next();
	else
		errors.send('Unauthorized', 'debug', res, 'User does not own the comment.');
};

/*** PARAM ***/

// Validate threadid parameter and get thread object
module.exports.threadParam = function (req, res, next, threadid) {
	BoardThread.findById(req.params.threadid, function (err, thread) {
		if (err)
			errors.send('DBError', 'warn', res, 'Thread ID validation error: ' + err);
		else if (!thread)
			errors.send('BadParameter', 'debug', res, 'Thread ID validation error: no thread found for given ID.');
		else {
			req.thread = thread;
			next();
		}
	});
};

/*** BOARD ACTIONS ***/

/*** THREADS ***/

/**
 * @api {get} /board List threads
 * @apiName listThreads
 * @apiGroup Board
 * @apiDescription Retrieve some threads from the DB, using parameters to apply filters.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (get parameters) {String} [country] Two-letter country code to filter threads.
 * @apiParam (get parameters) {String} [lang] Two-letter language code to filter threads.
 * @apiParam (get parameters) {Number} [off=0] News query offset.
 * @apiParam (get parameters) {Number} [num=20] Number of news retrieved.
 *
 * @apiSuccess {Object[]} result An array of objects, each representing a thread, ordered by update date. See 'Get a thread' for the single thread structure (the threads returned here do not have subdocuments, i.e. messages and comments).
 *
 * @apiError (500) error_name DBError
 */
module.exports.listThreads = function (req, res, next) {

	// Remove messages from results
	var projection = {
		messages: 0
	};

	// Build query based on parameters given
	var query = {};
	if (req.query.hasOwnProperty('country') && req.query.country !== '')
		query.country = req.query.country;
	if (req.query.hasOwnProperty('lang') && req.query.lang !== '')
		query.language = req.query.lang;

	// Sort by update time
	var sort = {
		updated: -1
	};

	// Query offset
	var offset = (req.query.hasOwnProperty('off') && !isNaN(req.query.off) ? req.query.off : 0);

	// Number of returned results
	var number = (req.query.hasOwnProperty('num') && !isNaN(req.query.num) ? req.query.num : 20);

	// Find threads
	BoardThread.find(query, projection).sort(sort).skip(offset).limit(number).exec(function (err, threads) {
		if (err)
			errors.send('DBError', 'warn', res, 'New message error: ' + err);
		else {

			// Save data for next queries, and reorganize threads
			var threadsData = {};
			var users = [];
			var threadIds = [];
			for (var i = 0; i < threads.length; i += 1) {
				users.push(threads[i].author);
				threadIds.push(threads[i]._id);
			}

			// Only do the other queries if some threads where returned
			if (threads.length === 0) {
				res.status(200).send({
					threads: {}
				});
			} else {
				// Get threads' authors data
				User.getByIds(users, req.headers['x-wolf-user-token'], function (uErr, authors) {
					if (uErr)
						errors.send('DBError', 'warn', res, 'List threads error - error rertieving authors\' data: ' + uErr);
					else {

						// Put authors' data in a more usable object
						var authorData = {};
						for (var j = 0; j < authors.length; j += 1)
							authorData[authors[j].id] = authors[j];

						// Get logged user's votes
						UserVote.find({
							user: req.tokenUser.id,
							content: {
								$in: threadIds
							}
						}, function (vErr, votes) {
							if (vErr)
								errors.send('DBError', 'warn', res, 'List threads error - error rertieving user\'s votes: ' + vErr);
							else {
								// Put user's votes data in a more usable object
								var userVotes = {};
								for (var k = 0; k < votes.length; k += 1)
									userVotes[votes[k].content] = votes[k].vote;

								// Put data inside the threads object and return it
								var tmpId = '';
								for (var l = 0; l < threads.length; l += 1) {
									tmpId = threads[l]._id;
									threadsData[tmpId] = threads[l].toJSON();
									threadsData[tmpId].voted = (userVotes.hasOwnProperty(tmpId) ? userVotes[tmpId] : 0);
									threadsData[tmpId].author = (authorData.hasOwnProperty(threads[l].author) ? authorData[threads[l].author] : {});
								}

								// Return data
								res.status(200).send({
									threads: threadsData
								});
							}
						});
					}
				});
			}
		}
	});
};

/**
 * @api {get} /board/:threadid Get a thread
 * @apiName getThread
 * @apiGroup Board
 * @apiDescription Get a thread given an ID.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid ID of the thread to be retrieved.
 *
 * @apiSuccess {String} _id The ID of the thread.
 * @apiSuccess {String} title The title of the thread.
 * @apiSuccess {String} text The text of the thread.
 * @apiSuccess {Date} time The time of creation of the thread.
 * @apiSuccess {Date} updated The time of the last update in the thread.
 * @apiSuccess {String} country Two-letter country code to filter threads.
 * @apiSuccess {String} language Two-letter language code to filter threads.
 * @apiSuccess {Number} messagesNumber Number of messages in this thread.
 * @apiSuccess {Number} commentsNumber Number of comments for all the messages in this thread.
 * @apiSuccess {Number} upvotes Number of upvotes for this thread.
 * @apiSuccess {Number} downvotes Number of downvotes for this thread.
 * @apiSuccess {Number} voted 1 or -1 if the logged user upvoted or downvoted the thread, 0 otherwise.
 *
 * @apiSuccess {Object} author Data about the author of the thread.
 * @apiSuccess {Number} author.id ID of the author of the thread.
 * @apiSuccess {String} author.username Username of the author of the thread.
 * @apiSuccess {String} author.email Email of the author of the thread.
 * @apiSuccess {String} author.firstname First name of the author of the thread.
 * @apiSuccess {String} author.lastname First name of the author of the thread.
 *
 * @apiSuccess {Object[]} messages Array of messages belonging to the thread.
 * @apiSuccess {Number} message._id ID of the message.
 * @apiSuccess {String} message.text The text of the message.
 * @apiSuccess {Date} message.time The time of creation of the message.
 * @apiSuccess {Date} message.updated The time of the last update in the message.
 * @apiSuccess {Number} message.upvotes Number of upvotes for this message.
 * @apiSuccess {Number} message.downvotes Number of downvotes for this message.
 * @apiSuccess {Number} message.voted 1 or -1 if the logged user upvoted or downvoted the message, 0 otherwise.
 *
 * @apiSuccess {Object[]} message.comments Array of comments belonging to the message.
 * @apiSuccess {Number} message.comment._id ID of the comment.
 * @apiSuccess {String} message.comment.text The text of the comment.
 * @apiSuccess {Date} message.comment.time The time of creation of the comment.
 * @apiSuccess {Number} message.comment.upvotes Number of upvotes for this comment.
 * @apiSuccess {Number} message.comment.downvotes Number of downvotes for this comment.
 * @apiSuccess {Number} message.comment.voted 1 or -1 if the logged user upvoted or downvoted the comment, 0 otherwise.
 *
 * @apiError (500) error_name DBError
 */
module.exports.getThread = function (req, res, next) {

	// Tur mongoose document to JSON
	var jsonThread = req.thread.toJSON();

	// Get all IDs of content
	var contentIds = [];
	var authorsIds = [];
	contentIds.push(jsonThread._id);
	authorsIds.push(jsonThread.author);
	// Cycle through all messages and comments
	for (var i = 0; i < jsonThread.messages.length; i += 1) {
		contentIds.push(jsonThread.messages[i]._id);
		authorsIds.push(jsonThread.messages[i].author);
		for (var j = 0; j < jsonThread.messages[i].comments.length; j += 1) {
			contentIds.push(jsonThread.messages[i].comments[j]._id);
			authorsIds.push(jsonThread.messages[i].comments[j].author);
		}
	}

	// Get threads' authors data
	User.getByIds(authorsIds, req.headers['x-wolf-user-token'], function (uErr, authors) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'List threads error - error rertieving authors\' data: ' + uErr);
		else {

			// Put authors' data in a more usable object
			var authorData = {};
			for (var j = 0; j < authors.length; j += 1)
				authorData[authors[j].id] = authors[j];

			// Get user's votes for content
			UserVote.find({
				user: req.tokenUser.id,
				content: {
					$in: contentIds
				}
			}, function (vErr, votes) {
				if (vErr)
					errors.send('DBError', 'warn', res, 'Get thread error - error rertieving user\'s vote: ' + vErr);
				else {

					// Put user's votes data in a more usable object
					var userVotes = {};
					for (var k = 0; k < votes.length; k += 1)
						userVotes[votes[k].content] = votes[k].vote;

					// Fill in thread data
					jsonThread.voted = (jsonThread._id in userVotes ? userVotes[jsonThread._id] : 0);
					jsonThread.author = (jsonThread.author in authorData ? authorData[jsonThread.author] : {});

					// Fill in messages and comments data
					for (var i = 0; i < jsonThread.messages.length; i += 1) {
						jsonThread.messages[i].voted = (jsonThread.messages[i]._id in userVotes ? userVotes[jsonThread.messages[i]._id] : 0);
						jsonThread.messages[i].author = (jsonThread.messages[i].author in authorData ? authorData[jsonThread.messages[i].author] : {});
						for (var j = 0; j < jsonThread.messages[i].comments.length; j += 1) {
							jsonThread.messages[i].comments[j].voted = (jsonThread.messages[i].comments[j]._id in userVotes ? userVotes[jsonThread.messages[i].comments[j]._id] : 0);
							jsonThread.messages[i].comments[j].author = (jsonThread.messages[i].comments[j].author in authorData ? authorData[jsonThread.messages[i].comments[j].author] : {});
						}
					}

					// Return data
					res.status(200).send({
						thread: jsonThread
					});
				}
			});
		}
	});
};

/**
 * @api {post} /board Create a new thread
 * @apiName newThread
 * @apiGroup Board
 * @apiDescription Create a new thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam {String} title The title of the thread.
 * @apiParam {String} text The text of the thread.
 * @apiParam {String} country Two-letter country code of the thread.
 * @apiParam {String} language Two-letter language code of the thread.
 *
 * @apiError (400) error_name MissingData
 * @apiError (500) error_name DBError
 */
module.exports.newThread = function (req, res, next) {

	// Get and check required parameters
	var title = (req.body.hasOwnProperty('title') ? req.body.title : -1);
	var text = (req.body.hasOwnProperty('text') ? req.body.text : -1);
	var country = (req.body.hasOwnProperty('country') ? req.body.country : -1);
	var language = (req.body.hasOwnProperty('language') ? req.body.language : -1);

	if (title === -1 || text === -1 || country === -1 || language === -1)
		errors.send('MissingData', 'debug', res, 'New thread error - missing parameters: ' + JSON.stringify(req.body));
	else {
		// New thread data
		var params = {
			title: title,
			text: text,
			country: country,
			language: language,
			author: req.tokenUser.id
		};
		// Create new thread
		var thread = new BoardThread(params);
		// Save new thread
		thread.save(function (saveErr, saveRes) {
			if (saveErr)
				errors.send('DBError', 'warn', res, 'New board thread error: ' + saveErr);
			else
				res.status(200).send(saveRes);
		});
	}
};

/**
 * @api {put} /board/:threadid Edit a thread
 * @apiName editThread
 * @apiGroup Board
 * @apiDescription Edit a thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread to edit.
 *
 * @apiParam {String} title The title of the thread.
 * @apiParam {String} text The text of the thread.
 *
 * @apiError (500) error_name DBError
 */
module.exports.editThread = function (req, res, next) {

	// Manage input
	var title = (req.body.hasOwnProperty('title') && req.body.title && req.body.title !== '' ? req.body.title : false);
	var text = (req.body.hasOwnProperty('text') && req.body.title && req.body.title !== '' ? req.body.text : false);

	// Update existing thread
	req.thread.edit(title, text, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Update board thread error: ' + uErr);
		else
			res.status(200).send(uRes);
	});
};

/**
 * @api {delete} /board/:threadid Delete a thread
 * @apiName deleteThread
 * @apiGroup Board
 * @apiDescription Delete a thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission administrator
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread to delete.
 *
 * @apiError (500) error_name DBError
 */
module.exports.removeThread = function (req, res, next) {
	BoardThread.remove({
		_id: req.thread.id
	}, function (rErr, rRes) {
		if (rErr)
			errors.send('DBError', 'warn', res, 'Remove thread error: ' + rErr);
		else
			res.status(200).send(rRes);
	});
};

/*** MESSAGES ***/

module.exports.getMessage = function (req, res, next) {
	var msg = req.thread.getMessage(req.params.messageid);
	res.status(200).send(msg.toJSON());
};

/**
 * @api {post} /board/:threadid Post a message
 * @apiName newMessage
 * @apiGroup Board
 * @apiDescription Post a new message to the given thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread for the new message.
 *
 * @apiParam {String} text The text of the message.
 *
 * @apiError (500) error_name DBError
 */
module.exports.newMessage = function (req, res, next) {
	req.thread.newMessage(req.body.text, req.tokenUser.id, function (mErr, mRes) {
		if (mErr)
			errors.send('DBError', 'warn', res, 'New message error: ' + mErr);
		else
			res.status(200).send(mRes);
	});
};

/**
 * @api {put} /board/:threadid/:messageid Edit a message
 * @apiName editMessage
 * @apiGroup Board
 * @apiDescription Edit a message in the given thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the message.
 * @apiParam (url parameters) {String} messageid The ID of the message to edit.
 *
 * @apiParam {String} text The text of the message.
 *
 * @apiError (500) error_name DBError
 */
module.exports.editMessage = function (req, res, next) {

	// Manage input
	var text = (req.body.hasOwnProperty('text') && req.body.title && req.body.title !== '' ? req.body.text : false);

	// Update existing thread
	req.thread.editMessage(req.params.messageid, text, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Update board message error: ' + uErr);
		else
			res.status(200).send(uRes);
	});
};

/**
 * @api {delete} /board/:threadid/:messageid Delete a message
 * @apiName deleteMessage
 * @apiGroup Board
 * @apiDescription Delete a message in the given thread.
 * @apiVersion 1.0.0
 *
 * @apiPermission administrator
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the message.
 * @apiParam (url parameters) {String} messageid The ID of the message to delete.
 *
 * @apiError (500) error_name DBError
 */
module.exports.removeMessage = function (req, res, next) {
	req.thread.removeMessage(req.params.messageid, function (rErr, rRes) {
		if (rErr)
			errors.send('DBError', 'warn', res, 'Remove message error: ' + rErr);
		else
			res.status(200).send(rRes);
	});
};

/*** COMMENTS ***/

module.exports.getComment = function (req, res, next) {
	var com = req.thread.getComment(req.params.messageid, req.params.commentid);
	res.status(200).send(com.toJSON());
};

/**
 * @api {post} /board/:threadid/:messageid Post a comment
 * @apiName newComment
 * @apiGroup Board
 * @apiDescription Post a new comment to the given thread and message.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread for the new comment.
 * @apiParam (url parameters) {String} messageid The ID of the message for the new comment.
 *
 * @apiParam {String} text The text of the comment.
 *
 * @apiError (500) error_name DBError
 */
module.exports.newComment = function (req, res, next) {
	req.thread.newComment(req.params.messageid, req.body.text, req.tokenUser.id, function (cErr, cRes) {
		if (cErr)
			errors.send('DBError', 'warn', res, 'New message error: ' + cErr);
		else
			res.status(200).send(cRes);
	});
};

/**
 * @api {put} /board/:threadid/:messageid/:commentid Edit a comment
 * @apiName editComment
 * @apiGroup Board
 * @apiDescription Edit a comment in the given thread and message.
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the comment.
 * @apiParam (url parameters) {String} messageid The ID of the message of the comment.
 * @apiParam (url parameters) {String} commentid The ID of the comment to edit.
 *
 * @apiParam {String} text The text of the message.
 *
 * @apiError (500) error_name DBError
 */
module.exports.editComment = function (req, res, next) {

	// Manage input
	var text = (req.body.hasOwnProperty('text') && req.body.title && req.body.title !== '' ? req.body.text : false);

	// Update existing thread
	req.thread.editComment(req.params.messageid, req.params.commentid, text, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Update board message error: ' + uErr);
		else
			res.status(200).send(uRes);
	});
};

/**
 * @api {delete} /board/:threadid/:messageid/:commentid Delete a comment
 * @apiName deleteComment
 * @apiGroup Board
 * @apiDescription Delete a comment in the given thread and message.
 * @apiVersion 1.0.0
 *
 * @apiPermission administrator
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the comment.
 * @apiParam (url parameters) {String} messageid The ID of the message of the comment.
 * @apiParam (url parameters) {String} messageid The ID of the comment to delete.
 *
 * @apiError (500) error_name DBError
 */
module.exports.removeComment = function (req, res, next) {
	req.thread.removeComment(req.params.messageid, req.params.commentid, function (rErr, rRes) {
		if (rErr)
			errors.send('DBError', 'warn', res, 'Remove comment error: ' + rErr);
		else
			res.status(200).send(rRes);
	});
};

/*** VOTES ***/

/**
 * @api {put} /board/:threadid/vote Upvote a thread
 * @apiName upvoteThread
 * @apiGroup Board
 * @apiDescription Upvote a thread. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread to upvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.upvoteThread = function (req, res, next) {
	req.thread.upvote(req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Thread upvote error: ' + uErr);
		else {
			var result = uRes.toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: 1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.thread.id, req.previousVote, 1);
		}
	});
};

/**
 * @api {delete} /board/:threadid/vote Downvote a thread
 * @apiName downvoteThread
 * @apiGroup Board
 * @apiDescription Downvote a thread. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread to downvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.downvoteThread = function (req, res, next) {
	req.thread.downvote(req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Thread downvote error: ' + uErr);
		else {
			var result = uRes.toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: -1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.thread.id, req.previousVote, -1);
		}
	});
};

/**
 * @api {put} /board/:threadid/:messageid/vote Upvote a message
 * @apiName upvoteMessage
 * @apiGroup Board
 * @apiDescription Upvote a message in a thread. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the message.
 * @apiParam (url parameters) {String} messageid The ID of the message to upvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.upvoteMessage = function (req, res, next) {
	req.thread.upvoteMessage(req.params.messageid, req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Message upvote error: ' + uErr);
		else {
			var result = uRes.messages.id(req.params.messageid).toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: 1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.params.messageid, req.previousVote, 1);
		}
	});
};

/**
 * @api {delete} /board/:threadid/:messageid/vote Downvote a message
 * @apiName downvoteMessage
 * @apiGroup Board
 * @apiDescription Downvote a message in a thread. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the message.
 * @apiParam (url parameters) {String} messageid The ID of the message to downvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.downvoteMessage = function (req, res, next) {
	req.thread.downvoteMessage(req.params.messageid, req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Message upvote error: ' + uErr);
		else {
			var result = uRes.messages.id(req.params.messageid).toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: -1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.params.messageid, req.previousVote, -1);
		}
	});
};

/**
 * @api {put} /board/:threadid/:messageid/:commentid/vote Upvote a comment
 * @apiName upvoteComment
 * @apiGroup Board
 * @apiDescription Upvote a comment in a thread and message. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the comment.
 * @apiParam (url parameters) {String} messageid The ID of the message of the comment.
 * @apiParam (url parameters) {String} commentid The ID of the comment to upvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.upvoteComment = function (req, res, next) {
	req.thread.upvoteComment(req.params.messageid, req.params.commentid, req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Comment upvote error: ' + uErr);
		else {
			var result = uRes.messages.id(req.params.messageid).comments.id(req.params.commentid).toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: 1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.params.commentid, req.previousVote, 1);
		}
	});
};

/**
 * @api {delete} /board/:threadid/:messageid/:commentid/vote Downvote a comment
 * @apiName downvoteComment
 * @apiGroup Board
 * @apiDescription Downvote a comment in a thread and message. A user can cast a single upvote/downvote for each content (thread, message or comment).
 * @apiVersion 1.0.0
 *
 * @apiPermission none
 * @apiParam (auth headers) {String} api_userid ID of the user.
 * @apiParam (auth headers) {String} api_access_token Access token of the user.
 *
 * @apiParam (url parameters) {String} threadid The ID of the thread of the comment.
 * @apiParam (url parameters) {String} messageid The ID of the message of the comment.
 * @apiParam (url parameters) {String} commentid The ID of the comment to downvote.
 *
 * @apiError (500) error_name DBError
 */
module.exports.downvoteComment = function (req, res, next) {
	req.thread.downvoteComment(req.params.messageid, req.params.commentid, req.previousVote, function (uErr, uRes) {
		if (uErr)
			errors.send('DBError', 'warn', res, 'Comment upvote error: ' + uErr);
		else {
			var result = uRes.messages.id(req.params.messageid).comments.id(req.params.commentid).toJSON();
			res.status(200).send({
				upvotes: result.upvotes,
				downvotes: result.downvotes,
				voted: -1
			});
			// Async save user vote data
			storeUserVote(req.tokenUser.id, req.params.commentid, req.previousVote, -1);
		}
	});
};

// Utility method to manage sotring and updating user's votes
var storeUserVote = function (user, content, previousVote, newVoteValue) {
	if (!previousVote) {
		// No previous vote, insert new vote in the db
		var voteData = {
			user: user,
			content: content,
			vote: newVoteValue
		};
		var vote = new UserVote(voteData);
		vote.save(function (sErr, sRes) {
			if (sErr)
				logger.warn('Upvote thread error - can not save user\'s vote: ' + sErr);
		});
	} else if (previousVote.vote !== newVoteValue) {
		// Change already saved vote
		previousVote.vote = newVoteValue;
		previousVote.save(function (pvErr, pvRes) {
			if (pvErr)
				logger.warn('Upvote thread error - can not save user\'s vote: ' + pvErr);
		});
	}
};