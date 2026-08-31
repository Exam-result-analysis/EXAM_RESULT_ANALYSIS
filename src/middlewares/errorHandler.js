// src/middlewares/errorHandler.js
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.isOperational ? err.message : (err.message || 'Internal server error'),
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (config.env !== 'production' && !err.isOperational) {
    payload.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error('Unhandled Error:', err);
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
