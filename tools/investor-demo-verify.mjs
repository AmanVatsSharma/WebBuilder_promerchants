/**
 * File: tools/investor-demo-verify.mjs
 * Module: investor-demo-ops
 * Purpose: Run a deterministic verification bundle for investor demo readiness
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { spawn } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  artifactNamePattern,
  buildArtifactCoverageMarkdown,
  buildCapturePlanMarkdown,
  captureChecklistRows,
  compactTimestamp,
  formatIstTimestamp,
} from './investor-artifact-utils.mjs';

const argv = process.argv.slice(2);
const isDryRun = argv.includes('--dry-run');
const outputArg = argv.find((arg) => arg.startsWith('--output='));
const outputPath = outputArg ? path.resolve(outputArg.split('=')[1] || '') : '';
const capturePlanArg = argv.find((arg) => arg.startsWith('--capture-plan='));
const capturePlanPath = capturePlanArg
  ? path.resolve(capturePlanArg.split('=')[1] || '')
  : '';
const artifactDirArg = argv.find((arg) => arg.startsWith('--artifact-dir='));
const artifactDirPath = artifactDirArg
  ? path.resolve(artifactDirArg.split('=')[1] || '')
  : '';
const artifactStrict = argv.includes('--artifact-strict');
const artifactReportMdArg = argv.find((arg) =>
  arg.startsWith('--artifact-report-md='),
);
const artifactReportMdPath = artifactReportMdArg
  ? path.resolve(artifactReportMdArg.split('=')[1] || '')
  : '';
const artifactManifestArg = argv.find((arg) =>
  arg.startsWith('--artifact-manifest='),
);
const artifactManifestPath = artifactManifestArg
  ? path.resolve(artifactManifestArg.split('=')[1] || '')
  : '';

const commands = [
  { id: 'test-builder', command: 'npx', args: ['nx', 'test', 'builder'] },
  { id: 'build-builder', command: 'npx', args: ['nx', 'build', 'builder'] },
  { id: 'build-docs', command: 'npm', args: ['run', 'docs:build'] },
];

function matchSlotFile(entries, chapter, surface, label, ext) {
  const slotToken = `-${chapter}-${surface}-${label}-`;
  return entries.filter((entry) => {
    const lower = entry.name.toLowerCase();
    return (
      entry.isFile() &&
      lower.includes(slotToken.toLowerCase()) &&
      lower.endsWith(`.${ext}`) &&
      artifactNamePattern().test(entry.name)
    );
  });
}

async function validateArtifactDirectory(targetDir) {
  const checklist = captureChecklistRows();
  const entries = await readdir(targetDir, { withFileTypes: true });
  const coverage = checklist.map(([chapter, surface, label, ext]) => {
    const matches = matchSlotFile(entries, chapter, surface, label, ext);
    return {
      chapter,
      surface,
      label,
      ext,
      matchedFiles: matches.map((item) => item.name),
      complete: matches.length > 0,
    };
  });
  const covered = coverage.filter((item) => item.complete).length;
  return {
    directory: targetDir,
    required: coverage.length,
    covered,
    missing: coverage.length - covered,
    coverage,
  };
}


function buildArtifactManifest(summary) {
  return {
    generatedAt: new Date().toISOString(),
    generatedAtIst: formatIstTimestamp(),
    verification: {
      success: summary.success,
      dryRun: summary.dryRun,
      checks: summary.results.map((item) => ({
        id: item.id,
        command: item.command,
        success: item.success,
        durationMs: item.durationMs,
        exitCode: item.exitCode,
      })),
    },
    artifactValidation: summary.artifactValidation,
  };
}

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
  const startedAtIst = formatIstTimestamp();
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
    startedAtIst,
    finishedAt: new Date().toISOString(),
    finishedAtIst: formatIstTimestamp(),
    success: results.every((entry) => entry.success),
    dryRun: isDryRun,
    results,
    artifactValidation: null,
  };

  if (capturePlanPath) {
    const stamp = compactTimestamp();
    const markdown = buildCapturePlanMarkdown(stamp);
    await writeFile(capturePlanPath, markdown, 'utf8');
    console.log(`[investor-demo-verify] wrote capture plan to ${capturePlanPath}`);
  }

  if (artifactDirPath) {
    try {
      const artifactValidation = await validateArtifactDirectory(artifactDirPath);
      summary.artifactValidation = artifactValidation;
      console.log('[investor-demo-verify] artifact coverage', {
        covered: artifactValidation.covered,
        required: artifactValidation.required,
        missing: artifactValidation.missing,
      });
      if (artifactStrict && artifactValidation.missing > 0) {
        summary.success = false;
      }
      if (artifactReportMdPath) {
        const markdown = buildArtifactCoverageMarkdown(artifactValidation);
        await writeFile(artifactReportMdPath, markdown, 'utf8');
        console.log(
          `[investor-demo-verify] wrote artifact coverage report to ${artifactReportMdPath}`,
        );
      }
      if (artifactManifestPath) {
        const manifest = buildArtifactManifest(summary);
        await writeFile(
          artifactManifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`,
          'utf8',
        );
        console.log(
          `[investor-demo-verify] wrote artifact manifest to ${artifactManifestPath}`,
        );
      }
    } catch (e) {
      summary.success = false;
      summary.artifactValidation = {
        directory: artifactDirPath,
        error: e instanceof Error ? e.message : String(e),
      };
      console.error('[investor-demo-verify] artifact validation failed', {
        reason: e instanceof Error ? e.message : String(e),
      });
      if (artifactManifestPath) {
        const manifest = buildArtifactManifest(summary);
        await writeFile(
          artifactManifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`,
          'utf8',
        );
        console.log(
          `[investor-demo-verify] wrote artifact manifest to ${artifactManifestPath}`,
        );
      }
    }
  }

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
