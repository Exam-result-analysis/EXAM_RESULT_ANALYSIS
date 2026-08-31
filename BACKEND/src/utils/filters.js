// src/utils/filters.js
/**
 * Builds dynamic WHERE clause for SQL queries.
 * Accepts pairs of [condition, value] and generates parameterized clause.
 */
function buildWhere(conditions) {
  const clauses = [];
  const params = [];

  for (const [cond, val] of conditions) {
    if (val !== undefined && val !== null && val !== '') {
      clauses.push(cond);
      params.push(val);
    }
  }

  return {
    clause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

module.exports = {
  buildWhere,
};
