// src/middlewares/errorHandler.js
const statusCodes = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_ERROR',
};

function normalizeError(err) {
  const databaseCode = String(err.code || '');
  const databaseConstraint = databaseCode.startsWith('SQLITE_CONSTRAINT') ||
    ['23502', '23503', '23505', '23514'].includes(databaseCode);

  if (databaseCode === 'SQLITE_CONSTRAINT_UNIQUE' || databaseCode === 'SQLITE_CONSTRAINT_PRIMARYKEY' || databaseCode === '23505') {
    return { statusCode: 409, code: 'DUPLICATE_RECORD', message: 'A record with these values already exists.' };
  }

  if (databaseConstraint) {
    return { statusCode: 422, code: 'DATABASE_CONSTRAINT_VIOLATION', message: 'The record violates a data constraint.' };
  }

  if (databaseCode === '22P02') {
    return { statusCode: 400, code: 'INVALID_FIELD_VALUE', message: 'A field contains an invalid value.' };
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Uploaded file exceeds the maximum allowed size.' };
  }

  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' };
  }

  const statusCode = Number(err.statusCode || err.status) || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;
  return {
    statusCode,
    code: statusCodes[statusCode] || (isClientError ? 'REQUEST_ERROR' : 'INTERNAL_SERVER_ERROR'),
    message: isClientError && (err.isOperational || err.statusCode || err.status)
      ? err.message
      : 'An unexpected error occurred.',
    details: isClientError && err.isOperational ? err.details : undefined,
  };
}

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const normalized = normalizeError(err);
  const log = normalized.statusCode >= 500 ? console.error : console.warn;
  log(JSON.stringify({
    level: normalized.statusCode >= 500 ? 'error' : 'warn',
    event: 'request_error',
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: normalized.statusCode,
    errorCode: normalized.code,
    error: err.message,
    stack: normalized.statusCode >= 500 ? err.stack : undefined,
  }));

  const payload = {
    success: false,
    code: normalized.code,
    message: normalized.message,
  };
  if (normalized.details) payload.details = normalized.details;
  if (req.id) payload.requestId = req.id;

  return res.status(normalized.statusCode).json(payload);
};

module.exports = errorHandler;
