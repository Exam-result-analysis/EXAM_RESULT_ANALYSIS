const rateLimit = require("express-rate-limit");

const isTest = process.env.NODE_ENV === 'test';

// General API rate limiting
const generalLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

// Login brute-force protection
const loginLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes."
  }
});

// Password-related endpoint protection
const passwordLimiter = isTest ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many password-related requests. Please try again after 15 minutes."
  }
});

module.exports = {
  generalLimiter,
  loginLimiter,
  passwordLimiter
};