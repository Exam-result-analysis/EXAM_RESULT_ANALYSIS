// src/routes/result.routes.js
const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');

router.get('/', resultController.getAll);
router.get('/:id', resultController.getById);
router.post('/', resultController.create);
router.delete('/:id', resultController.deleteResult);

module.exports = router;
