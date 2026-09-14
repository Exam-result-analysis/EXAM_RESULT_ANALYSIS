// src/controllers/export.controller.js
const exportService = require('../service/export.service');

async function exportData(req, res, next) {
  try {
    const { module: moduleName = 'department', type = 'csv', ...options } = req.query;
    const { contentType, filename, content } = await exportService.generateExport(moduleName, type, options);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  } catch (error) {
    next(error);
  }
}

async function downloadTemplate(req, res, next) {
  try {
    const { format = 'xlsx' } = req.query;
    const { contentType, filename, content } = await exportService.generateTemplate(format);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  exportData,
  downloadTemplate,
};
