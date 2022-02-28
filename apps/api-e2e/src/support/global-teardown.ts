import { killPort } from '@nx/node/utils';
/* eslint-disable */

module.exports = async function() {
  // Put clean up logic here (e.g. stopping services, docker-compose, etc.).
  // Hint: `globalThis` is shared between setup and teardown.
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await killPort(port);
  try {
    const pid = globalThis.__API_PID__;
    if (pid) process.kill(pid, 'SIGTERM');
  } catch (e) {
    // ignore
  }
  console.log(globalThis.__TEARDOWN_MESSAGE__);
};
