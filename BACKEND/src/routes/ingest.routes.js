// src/routes/ingest.routes.js
const router = require('express').Router();
const controller = require('../controllers/ingest.controller');

router.post('/', controller.ingest);

module.exports = router;
