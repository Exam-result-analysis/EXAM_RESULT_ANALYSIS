// src/server.js
const app = require('./app');
const config = require('./config/env');

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(` Exam Result Analysis API is running`);
  console.log(` URL: http://localhost:${config.port}`);
  console.log(` Environment: ${config.env}`);
  console.log(`====================================================`);
});

const shutdown = (signal) => {
  console.log(`\n${signal} received. Gracefully closing server...`);
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
