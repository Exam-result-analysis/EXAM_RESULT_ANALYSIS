// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { loginLimiter } = require('../middlewares/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/me', authMiddleware, authController.getProfile);

// Password recovery endpoints
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password/:token', authController.openResetPassword);

module.exports = router;
