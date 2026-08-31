// src/controllers/result.controller.js
const resultService = require('../service/result.service');
const { success } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const data = await resultService.getAllResults(req.query);
    return success(res, 200, 'Results fetched successfully', data);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await resultService.getResultById(req.params.id);
    return success(res, 200, 'Result fetched successfully', data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const data = await resultService.createResult(req.body);
    return success(res, 201, 'Result created successfully', data);
  } catch (err) {
    next(err);
  }
}

async function deleteResult(req, res, next) {
  try {
    const data = await resultService.deleteResult(req.params.id);
    return success(res, 200, 'Result deleted successfully', data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  deleteResult,
};
