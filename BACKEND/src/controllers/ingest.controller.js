// src/controllers/ingest.controller.js
const ingestService = require('../service/ingest.service');
const { success } = require('../utils/response');

async function ingest(req, res, next) {
  try {
    const payload = req.body.results || req.body;
    const stats = await ingestService.ingestRawData(payload);
    return success(res, 200, 'Raw data ingested and normalized successfully', stats);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ingest,
};
