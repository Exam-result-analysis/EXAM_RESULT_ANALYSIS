// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const config = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const analysisRoutes = require('./routes/analysis.routes');
const authRoutes = require('./routes/auth.routes');
const resultRoutes = require('./routes/result.routes');
const protectedRoutes = require('./routes/protected.routes');
const exportRoutes = require('./routes/export.routes');
const filterRoutes = require('./routes/filter.routes');
const ingestRoutes = require('./routes/ingest.routes');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'exam-result-analysis-api',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'exam-result-analysis-api',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/ingest', ingestRoutes);



// Catch 404 and forward to error handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
