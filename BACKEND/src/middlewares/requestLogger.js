// src/middlewares/requestLogger.js
const morgan = require('morgan');

module.exports = morgan((tokens, req, res) => JSON.stringify({
	level: 'info',
	event: 'http_request',
	requestId: req.id,
	method: req.method,
	path: req.path,
	statusCode: Number(tokens.status(req, res)),
	durationMs: Number(tokens['response-time'](req, res)),
}));
