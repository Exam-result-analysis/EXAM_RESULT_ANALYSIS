// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { error } = require('../utils/response');

/**
 * JWT Authentication Middleware
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return error(res, 401, 'Authentication token is required');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return error(res, 401, 'Authorization header must be in the format: Bearer <token>');
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 401, 'Authentication token has expired');
    }
    return error(res, 401, 'Invalid authentication token');
  }
}

module.exports = authMiddleware;
