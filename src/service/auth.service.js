// src/service/auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const config = require('../config/env');
const ApiError = require('../utils/apiError');

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
  getProfile,
};
