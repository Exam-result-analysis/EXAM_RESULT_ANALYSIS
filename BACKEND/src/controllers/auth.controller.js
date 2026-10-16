// src/controllers/auth.controller.js
const authService = require('../service/auth.service');
const { success } = require('../utils/response');

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

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const data = await authService.forgotPassword(email);
    return success(res, 200, data.message, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-reset-token
 */
async function verifyResetToken(req, res, next) {
  try {
    const token = req.body?.token || req.query?.token;
    const data = await authService.verifyResetToken(token);
    return success(res, 200, 'Token is valid', data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const data = await authService.resetPassword(token, newPassword);
    return success(res, 200, data.message, data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/reset-password/:token
 */
async function openResetPassword(req, res, next) {
  try {
    const { token } = req.params;
    await authService.verifyResetToken(token);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  register,
  logout,
  getProfile,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  openResetPassword,
};
