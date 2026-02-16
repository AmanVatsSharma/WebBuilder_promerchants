/**
 * File: tools/investor-demo-verify.mjs
 * Module: investor-demo-ops
 * Purpose: Run a deterministic verification bundle for investor demo readiness
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const isDryRun = argv.includes('--dry-run');
const outputArg = argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg ? path.resolve(outputArg.split('=')[1] || '') : '';

const commands = [
  { id: 'test-builder', command: 'npx', args: ['nx', 'test', 'builder'] },
  { id: 'build-builder', command: 'npx', args: ['nx', 'build', 'builder'] },
  { id: 'build-docs', command: 'npm', args: ['run', 'docs:build'] },
];

function runCommand(entry) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(entry.command, entry.args, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });
    child.on('close', (code) => {
      const finishedAt = Date.now();
      resolve({
        id: entry.id,
        command: `${entry.command} ${entry.args.join(' ')}`,
        startedAt,
        finishedAt,
        durationMs: finishedAt - startedAt,
        success: code === 0,
        exitCode: code ?? 1,
      });
    });
  });
}

async function main() {
  const startedAt = new Date().toISOString();
  const results = [];

  for (const entry of commands) {
    console.log(`[investor-demo-verify] start ${entry.id}`);
    if (isDryRun) {
      results.push({
        id: entry.id,
        command: `${entry.command} ${entry.args.join(' ')}`,
        startedAt: Date.now(),
        finishedAt: Date.now(),
        durationMs: 0,
        success: true,
        exitCode: 0,
        dryRun: true,
      });
      console.log(`[investor-demo-verify] dry-run ${entry.id}`);
      continue;
    }
    const result = await runCommand(entry);
    results.push(result);
    console.log(`[investor-demo-verify] done ${entry.id}`, {
      success: result.success,
      durationMs: result.durationMs,
    });
    if (!result.success) break;
  }

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    success: results.every((entry) => entry.success),
    dryRun: isDryRun,
    results,
  };

  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`[investor-demo-verify] wrote summary to ${outputPath}`);
  }

  console.log('[investor-demo-verify] summary', {
    success: summary.success,
    checks: summary.results.length,
  });
  if (!summary.success) process.exit(1);
}

void main();
