import { waitForPortOpen } from '@nx/node/utils';
import { spawn } from 'child_process';

/* eslint-disable */
var __TEARDOWN_MESSAGE__: string;

module.exports = async function() {
  // Start services that that the app needs to run (e.g. database, docker-compose, etc.).
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Start API server (avoid Nx @nx/js:node serve executor issues in some Node versions).
  // Assumes `api:build` already ran via `api-e2e` dependsOn.
  const child = spawn('node', ['dist/apps/api/main.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      HOST: host,
      PORT: String(port),
      DB_TYPE: process.env.DB_TYPE || 'sqljs',
      THEME_BUILD_MODE: process.env.THEME_BUILD_MODE || 'inline',
      ENFORCE_AUTH_CONTEXT: process.env.ENFORCE_AUTH_CONTEXT || 'true',
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET || 'e2e-secret',
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  });
  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__API_PID__ = child.pid;

  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};

