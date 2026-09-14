// src/server.js
const app = require('./app');
const config = require('./config/env');

let currentPort = Number(config.port) || 5000;

function startServer(port) {
  const server = app.listen(port);

  server.on('listening', () => {
    console.log(`====================================================`);
    console.log(` Exam Result Analysis System is running`);
    console.log(` URL: http://localhost:${port}`);
    console.log(` Environment: ${config.env}`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[WARN] Port ${port} is currently occupied.`);
      console.warn(`[INFO] Automatically binding to next available port: ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server encountered fatal error:', err);
      process.exit(1);
    }
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

  return server;
}

const server = startServer(currentPort);

module.exports = server;
