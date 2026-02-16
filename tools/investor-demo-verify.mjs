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

const commands = [
  { id: 'test-builder', command: 'npx', args: ['nx', 'test', 'builder'] },
  { id: 'build-builder', command: 'npx', args: ['nx', 'build', 'builder'] },
  { id: 'build-docs', command: 'npm', args: ['run', 'docs:build'] },
];

function compactTimestamp() {
  const now = new Date();
  const year = `${now.getFullYear()}`;
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hours = `${now.getHours()}`.padStart(2, '0');
  const mins = `${now.getMinutes()}`.padStart(2, '0');
  return `${year}${month}${day}-${hours}${mins}`;
}

function captureChecklistRows() {
  return [
    ['ch1', 'dashboard', 'hero-metrics', 'png'],
    ['ch1', 'dashboard', 'project-card-release-context', 'png'],
    ['ch1', 'dashboard', 'domain-ops-pulse', 'png'],
    ['ch2', 'theme-studio', 'curation-presets', 'png'],
    ['ch2', 'theme-studio', 'inventory-focus', 'png'],
    ['ch2', 'theme-studio', 'theme-card-readiness', 'png'],
    ['ch3', 'publish-center', 'release-snapshot', 'png'],
    ['ch3', 'publish-center', 'quick-actions', 'png'],
    ['ch3', 'publish-center', 'rollback-history', 'png'],
    ['ch4', 'storefront', 'published-proof', 'png'],
    ['ops', 'terminal', 'demo-verify-log', 'log'],
    ['ops', 'theme-studio', 'curation-export-json', 'json'],
  ];
}

function artifactNamePattern() {
  return /^\d{8}-\d{4}-[a-z0-9-]+-v\d+\.(png|mp4|log|json)$/i;
}

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

function buildCapturePlanMarkdown(generatedAt) {
  const rows = captureChecklistRows();
  const lines = [
    '# Investor Demo Artifact Capture Plan',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Capture checklist',
    '',
  ];
  for (const [chapter, surface, label, ext] of rows) {
    const suggested = `${generatedAt}-${chapter}-${surface}-${label}-v1.${ext}`;
    lines.push(`- [ ] ${chapter.toUpperCase()} ${surface} — ${label} -> \`${suggested}\``);
  }
  lines.push('', '## Notes', '', '- Keep viewport and zoom consistent across captures.');
  lines.push('- Regenerate plan if demo flow significantly changes.');
  return `${lines.join('\n')}\n`;
}

function buildArtifactCoverageMarkdown(artifactValidation) {
  const lines = [
    '# Investor Artifact Coverage Report',
    '',
    `Directory: ${artifactValidation.directory}`,
    `Coverage: ${artifactValidation.covered}/${artifactValidation.required}`,
    '',
    '| Slot | Status | Matched files |',
    '| --- | --- | --- |',
  ];
  for (const row of artifactValidation.coverage) {
    const slot = `${row.chapter}/${row.surface}/${row.label}.${row.ext}`;
    const status = row.complete ? '✅ complete' : '❌ missing';
    const files = row.matchedFiles.length ? row.matchedFiles.join(', ') : '-';
    lines.push(`| ${slot} | ${status} | ${files} |`);
  }
  return `${lines.join('\n')}\n`;
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
    } catch (e) {
      summary.success = false;
      summary.artifactValidation = {
        directory: artifactDirPath,
        error: e instanceof Error ? e.message : String(e),
      };
      console.error('[investor-demo-verify] artifact validation failed', {
        reason: e instanceof Error ? e.message : String(e),
      });
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
