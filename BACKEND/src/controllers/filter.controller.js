// src/controllers/filter.controller.js
const filterService = require('../service/filter.service');
const { success } = require('../utils/response');

async function getFilters(req, res, next) {
  try {
    const data = await filterService.getFilterOptions();
    return success(res, 200, 'Filters retrieved successfully', data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getFilters,
};
