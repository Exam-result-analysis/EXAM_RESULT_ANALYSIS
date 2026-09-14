// src/service/filter.service.js
const { query } = require('../config/database');

async function getFilterOptions() {
  const yearsRes = ['2023-24', '2024-25'];
  const semRes = await query('SELECT DISTINCT curr_sems FROM exam_results ORDER BY curr_sems ASC');
  const degRes = await query('SELECT d.degree_code, d.degree_name, d.delivery_mode, d.university_code, u.university_name FROM degrees d JOIN universities u ON u.university_code = d.university_code ORDER BY d.delivery_mode ASC, d.degree_code ASC');
  const subjRes = await query('SELECT subject_code, subject_uncode, subject_name FROM subjects ORDER BY subject_code ASC');
  const typeRes = await query('SELECT type_code, description FROM exam_types ORDER BY type_code ASC');
  const studentRes = await query("SELECT s.regn_numb AS student_id, s.regn_numb, ('Candidate ' || s.regn_numb) AS student_name, s.degree_code, s.degree_code AS department_id, s.degree_code AS course_id FROM students s ORDER BY s.regn_numb ASC LIMIT 500");

  // Provide mapped objects matching both new schema and frontend compatibility
  const mappedDegrees = degRes.rows.map(d => ({
    department_id: d.degree_code,
    department_code: String(d.degree_code),
    department_name: d.degree_name,
    degree_code: d.degree_code,
    degree_name: d.degree_name,
    delivery_mode: d.delivery_mode,
    university_code: d.university_code,
    university_name: d.university_name
  }));

  const mappedCourses = degRes.rows.map(d => ({
    course_id: d.degree_code,
    course_code: String(d.degree_code),
    course_name: d.degree_name,
    department_id: d.degree_code,
    degree_code: d.degree_code,
    degree_name: d.degree_name,
    delivery_mode: d.delivery_mode
  }));

  return {
    academic_years: yearsRes,
    semesters: semRes.rows.map(r => r.curr_sems),
    delivery_modes: ['ALL', 'ONLINE', 'OFFLINE'],
    departments: mappedDegrees,
    courses: mappedCourses,
    degrees: degRes.rows,
    subjects: subjRes.rows,
    exam_types: typeRes.rows,
    sample_students: studentRes.rows,
  };
}

module.exports = {
  getFilterOptions,
};
