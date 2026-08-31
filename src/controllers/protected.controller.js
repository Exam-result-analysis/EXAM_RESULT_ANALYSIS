// src/controllers/protected.controller.js
const { success } = require('../utils/response');

/**
 * GET /api/protected
 * Protected route demonstration. req.user is populated by authMiddleware.
 */
function getProfile(req, res) {
  return success(res, 200, 'Authenticated request successful', {
    user: req.user,
  });
}

module.exports = { getProfile };
