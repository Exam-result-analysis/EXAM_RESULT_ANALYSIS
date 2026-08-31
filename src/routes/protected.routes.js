// src/routes/protected.routes.js
const express = require('express');
const router = express.Router();
const protectedController = require('../controllers/protected.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, protectedController.getProfile);

module.exports = router;
