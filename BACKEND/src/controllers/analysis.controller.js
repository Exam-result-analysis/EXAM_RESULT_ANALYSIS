// src/controllers/analysis.controller.js
const analysisService = require('../service/analysis.service');
const { success } = require('../utils/response');

const handle = (serviceMethod) => async (req, res, next) => {
  try {
    const data = await serviceMethod(req.query);
    return success(res, 200, 'Success', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  overall: handle(analysisService.overall),
  department: handle(analysisService.department),
  course: handle(analysisService.course),
  session: handle(analysisService.session),
  mode: handle(analysisService.mode),
  subject: handle(analysisService.subject),
  student: handle(analysisService.student),
};
