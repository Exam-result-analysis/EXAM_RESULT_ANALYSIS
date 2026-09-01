// src/routes/result.routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const resultController = require('../controllers/result.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

router.get('/', resultController.getAll);
router.get('/:id', resultController.getById);
router.post('/', resultController.create);
router.put('/:id', resultController.updateResult);
router.delete('/:id', resultController.deleteResult);
router.post('/upload', upload.single('file'), resultController.uploadResults);
router.post('/bulk', upload.single('file'), resultController.uploadResults);

module.exports = router;
