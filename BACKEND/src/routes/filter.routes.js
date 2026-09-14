// src/routes/filter.routes.js
const router = require('express').Router();
const controller = require('../controllers/filter.controller');

router.get('/', controller.getFilters);

module.exports = router;
