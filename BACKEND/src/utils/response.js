// src/utils/response.js
/**
 * Standard API Success Response
 */
function success(res, statusCode = 200, message = 'Success', data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Standard API Error Response
 */
function error(res, statusCode = 500, message = 'An error occurred', details = null) {
  const payload = {
    success: false,
    message,
  };
  if (details) {
    payload.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  success,
  error,
};
