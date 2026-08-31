// src/routes/analysis.routes.js
const router = require('express').Router();
const controller = require('../controllers/analysis.controller');

router.get('/overall', controller.overall);
router.get('/department', controller.department);
router.get('/course', controller.course);
router.get('/session', controller.session);
router.get('/mode', controller.mode);
router.get('/subject', controller.subject);
router.get('/student', controller.student);

module.exports = router;
