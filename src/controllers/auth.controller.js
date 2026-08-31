// src/controllers/auth.controller.js
const authService = require('../service/auth.service');
const { success, error } = require('../utils/response');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    return success(res, 200, 'Login successful', data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { email, password, role } = req.body;
    const data = await authService.register(email, password, role);
    return success(res, 201, 'User registered successfully', data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
function logout(req, res) {
  return success(res, 200, 'Logout successful', {});
}

/**
 * GET /api/auth/profile
 */
async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.userId);
    return success(res, 200, 'User profile retrieved successfully', { user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  register,
  logout,
  getProfile,
};
