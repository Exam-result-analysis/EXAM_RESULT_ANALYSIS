// scripts/setup.js
// Runs database initialization and seeding for the project.
const { spawnSync } = require('child_process');
const path = require('path');

console.log('Running database setup and seed...');
const seedScript = path.join(__dirname, '..', 'database', 'seed.js');
const result = spawnSync('node', [seedScript], { stdio: 'inherit' });

if (result.status !== 0) {
  console.error('Setup failed with exit code:', result.status);
  process.exit(result.status || 1);
}

console.log('Setup completed successfully.');
