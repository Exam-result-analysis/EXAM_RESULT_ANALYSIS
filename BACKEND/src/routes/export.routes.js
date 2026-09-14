// src/routes/export.routes.js
const router = require('express').Router();
const controller = require('../controllers/export.controller');

router.get('/template', controller.downloadTemplate);
router.get('/', controller.exportData);

module.exports = router;
