// src/controllers/result.controller.js
const path = require('path');
const resultService = require('../service/result.service');
const { success } = require('../utils/response');
const ApiError = require('../utils/apiError');

/**
 * GET /api/results
 */
async function getAll(req, res, next) {
  try {
    const data = await resultService.getAllResults(req.query);
    return success(res, 200, 'Results fetched successfully', data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/results/:id
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      throw new ApiError(400, `Invalid result ID '${id}'. ID must be a positive integer.`);
    }
    const data = await resultService.getResultById(id);
    return success(res, 200, 'Result fetched successfully', data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/results
 */
async function create(req, res, next) {
  try {
    const data = await resultService.createResult(req.body);
    return success(res, 201, 'Result created successfully', data);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/results/:id
 */
async function updateResult(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      throw new ApiError(400, `Invalid result ID '${id}'. ID must be a positive integer.`);
    }
    const data = await resultService.updateResult(id, req.body);
    return success(res, 200, 'Result updated successfully', data);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/results/:id
 */
async function deleteResult(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      throw new ApiError(400, `Invalid result ID '${id}'. ID must be a positive integer.`);
    }
    const data = await resultService.deleteResult(id);
    return success(res, 200, `Result ${id} deleted successfully`, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/results/upload or POST /api/results/bulk
 * Bulk upload results from an Excel file (.xlsx / .xls)
 */
async function uploadResults(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Please upload an Excel file using the form-data field name "file".');
    }

    const extension = path.extname(req.file.originalname || '').toLowerCase();
    if (!['.xlsx', '.xls'].includes(extension)) {
      throw new ApiError(400, 'Only Excel files (.xlsx or .xls) are supported.');
    }

    const examId = Number(req.body.exam_id);
    if (!Number.isInteger(examId) || examId <= 0) {
      throw new ApiError(400, 'A valid positive integer exam_id is required in the request body.');
    }

    const data = await resultService.uploadResults(req.file.buffer, examId);
    return success(res, 200, 'Bulk result upload processed successfully.', data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  updateResult,
  deleteResult,
  uploadResults,
};
