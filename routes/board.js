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
var express = require('express');
var router = express.Router();
var auth = require('../controllers/auth');
var board = require('../controllers/board');

// All routes require api tokens
router.use(auth.checkApiToken);

router.route('/')
	// GET - list all threads
	.get(auth.checkUserToken, board.listThreads)
	// POST - create a new thread
	.post(auth.checkUserToken, board.newThread);

router.route('/:threadid')
	// GET - get the given thread
	.get(auth.checkUserToken, board.getThread)
	// POST - add a new message to the given thread
	.post(auth.checkUserToken, board.newMessage)
	// PUT - edit a thread
	.put(auth.checkUserToken, board.userOwnsThread, board.editThread)
	// DELETE - remove a thread
	.delete(auth.checkUserToken, board.userOwnsThread, board.removeThread);

router.route('/:threadid/vote')
	// PUT - upvote a thread
	.put(auth.checkUserToken, board.checkThreadVote, board.upvoteThread)
	// DELETE - downvote a thread
	.delete(auth.checkUserToken, board.checkThreadVote, board.downvoteThread);

router.route('/:threadid/:messageid')
	// GET - get a single message
	.get(auth.checkUserToken, board.getMessage)
	// POST - add a new comment to the given message in the given thread
	.post(auth.checkUserToken, board.newComment)
	// PUT - edit a message
	.put(auth.checkUserToken, board.userOwnsMessage, board.editMessage)
	// DELETE - remove a message
	.delete(auth.checkUserToken, board.userOwnsMessage, board.removeMessage);

router.route('/:threadid/:messageid/vote')
	// PUT - upvote a message
	.put(auth.checkUserToken, board.checkMessageVote, board.upvoteMessage)
	// DELETE - downvote a message
	.delete(auth.checkUserToken, board.checkMessageVote, board.downvoteMessage);

router.route('/:threadid/:messageid/:commentid')
	// GET - get a single comment
	.get(auth.checkUserToken, board.getComment)
	// PUT - edit a comment
	.put(auth.checkUserToken, board.userOwnsComment, board.editComment)
	// DELETE - delete a comment
	.delete(auth.checkUserToken, board.userOwnsComment, board.removeComment);

router.route('/:threadid/:messageid/:commentid/vote')
	// PUT - upvote a comment
	.put(auth.checkUserToken, board.checkCommentVote, board.upvoteComment)
	// DELETE - downvote a comment
	.delete(auth.checkUserToken, board.checkCommentVote, board.downvoteComment);

// Validate thread ID and get thread
router.param('threadid', board.threadParam);

module.exports = router;