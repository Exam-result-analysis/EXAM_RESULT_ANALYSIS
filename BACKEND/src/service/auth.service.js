// src/service/auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/database');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const generateResetToken = require('../utils/token');
const sendResetEmail = require('./emailService');

/**
 * Verifies user credentials and issues a JWT token.
 */
async function login(email, password) {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const result = await query('SELECT id, email, password_hash, role FROM users WHERE email = ?', [email]);
  if (result.rowCount === 0) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Registers a new user and issues a JWT token.
 */
async function register(email, password, role = 'student') {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const validRoles = ['admin', 'faculty', 'student'];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${validRoles.join(', ')}`);
  }

  const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.rowCount > 0) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const insert = await query(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email, passwordHash, role]
  );

  const userId = insert.lastInsertRowid;
  const token = jwt.sign({ userId, email, role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return {
    token,
    user: {
      id: userId,
      email,
      role,
    },
  };
}

/**
 * Initiates forgot password workflow and generates timed reset token.
 */
async function forgotPassword(email) {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const userResult = await query('SELECT id, email FROM users WHERE email = ?', [email]);

  // Prevent email enumeration
  if (userResult.rowCount === 0) {
    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  const user = userResult.rows[0];
  const { token, hashedToken } = generateResetToken();
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await query(
    'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
    [hashedToken, expiry, user.id]
  );

  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  const resetLink = `${baseUrl}/api/auth/reset-password/${token}`;

  await sendResetEmail(user.email, resetLink);

  return {
    message: 'If an account exists with this email, a password reset link has been sent.',
    resetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    token: process.env.NODE_ENV !== 'production' ? token : undefined,
  };
}

/**
 * Validates a password reset token.
 */
async function verifyResetToken(token) {
  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const result = await query(
    'SELECT id, email, reset_token_expiry FROM users WHERE reset_token = ?',
    [hashedToken]
  );

  if (result.rowCount === 0) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  const user = result.rows[0];
  const expiryTime = new Date(user.reset_token_expiry).getTime();
  if (isNaN(expiryTime) || expiryTime <= Date.now()) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  return {
    userId: user.id,
    email: user.email,
  };
}

/**
 * Resets user password using valid token.
 */
async function resetPassword(token, newPassword) {
  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const { userId } = await verifyResetToken(token);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query(
    'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
    [hashedPassword, userId]
  );

  return {
    message: 'Password reset successfully',
  };
}

/**
 * Fetches user profile by ID.
 */
async function getProfile(userId) {
  const result = await query('SELECT id, email, role, created_at FROM users WHERE id = ?', [userId]);
  if (result.rowCount === 0) {
    throw new ApiError(404, 'User not found');
  }
  return result.rows[0];
}

module.exports = {
  login,
  register,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  getProfile,
};
