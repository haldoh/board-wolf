/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var logger = require('./logger');

// Define errors

var error = {
	'400': {
		'http_status': '400',
		'error_class': 'BadRequest',
		'sub_error': {
			'1': {
				'error_code': '1',
				'error_name': 'MissingData',
				'error_desc': 'Missing required parameters from request.'
			},
			'2': {
				'error_code': '2',
				'error_name': 'BadParameter',
				'error_desc': 'Parameter wrong or badly formatted.',
			}
		}
	},
	'401': {
		'http_status': '401',
		'error_class': 'Unauthorized',
		'sub_error': {
			'1': {
				'error_code': '1',
				'error_name': 'UserAuthenticationError',
				'error_desc': 'User not authenticated.'
			},
			'2': {
				'error_code': '2',
				'error_name': 'JWTError',
				'error_desc': 'Token verification error.'
			},
			'3': {
				'error_code': '3',
				'error_name': 'ServiceAuthenticationError',
				'error_desc': 'Service not authenticated.'
			},
			'4': {
				'error_code': '4',
				'error_name': 'PermissionsError',
				'error_desc': 'Insufficient permissions.'
			}
		}
	},
	'403': {
		'http_status': '403',
		'error_class': 'Forbidden',
		'sub_error': {
			'1': {
				'error_code': '1',
				'error_name': 'AuthorizationError',
				'error_desc': 'Unauthorized operation.'
			}
		}
	},
	'404': {
		'http_status': '404',
		'error_class': 'NotFound',
		'sub_error': {
			'1': {
				'error_code': '1',
				'error_name': 'ResourceNotFound',
				'error_desc': 'Requested resource not found.'
			}
		}
	},
	'500': {
		'http_status': '500',
		'error_class': 'InternalServerError',
		'sub_error': {
			'1': {
				'error_code': '1',
				'error_name': 'DBError',
				'error_desc': 'Database server error.'
			}
		}
	},
};

// Function to send back the correct error
module.exports.send = function (errorCode, subErrorCode, logLevel, res, errorMethod, errorFull) {

	// Check if the codes given match a known error
	if (error.hasOwnProperty(errorCode) && error[errorCode].sub_error.hasOwnProperty(subErrorCode)) {

		// Build error object to send back
		var resError = {
			'http_status': error[errorCode].http_status,
			'error_class': error[errorCode].error_class,
			'error_code': error[errorCode].http_status + '.' + error[errorCode].sub_error[subErrorCode].error_code,
			'error_name': error[errorCode].sub_error[subErrorCode].error_name,
			'error_desc': error[errorCode].sub_error[subErrorCode].error_desc
		};
		if (errorMethod)
			resError.error_method = errorMethod;
		if (errorFull)
			resError.error_full = errorFull;

		// Log
		logger[logLevel](JSON.stringify(resError));

		// Send
		res.status(resError.http_status).send(resError);
	} else {

		// Log
		logger.error('An undefined error occurred: ' + errorMethod + ' - ' + errorFull);

		// Send
		res.status(500).send('An undefined error occurred: ' + errorMethod + ' - ' + errorFull);
	}
};