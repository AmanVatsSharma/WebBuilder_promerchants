/**
 * File: tools/investor-artifact-trend.mjs
 * Module: investor-demo-ops
 * Purpose: Compare two artifact verification summaries and report readiness deltas
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const baseArg = argv.find((arg) => arg.startsWith('--base='));
const candidateArg = argv.find((arg) => arg.startsWith('--candidate='));
const outputArg = argv.find((arg) => arg.startsWith('--output-md='));

const basePath = baseArg ? path.resolve(baseArg.split('=')[1] || '') : '';
const candidatePath = candidateArg
  ? path.resolve(candidateArg.split('=')[1] || '')
  : '';
const outputPath = outputArg ? path.resolve(outputArg.split('=')[1] || '') : '';

if (!basePath || !candidatePath) {
  console.error(
    '[investor-artifact-trend] missing required --base and --candidate arguments',
  );
  process.exit(1);
}

async function readSummary(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function readiness(summary) {
  return {
    score: Number(summary?.artifactReadiness?.score || 0),
    deductions: {
      missing: Number(summary?.artifactReadiness?.deductions?.missing || 0),
      unexpected: Number(summary?.artifactReadiness?.deductions?.unexpected || 0),
      nonConforming: Number(
        summary?.artifactReadiness?.deductions?.nonConforming || 0,
      ),
      placeholders: Number(summary?.artifactReadiness?.deductions?.placeholders || 0),
      contentIssues: Number(summary?.artifactReadiness?.deductions?.contentIssues || 0),
    },
  };
}

function buildTrendReport(baseSummary, candidateSummary) {
  const base = readiness(baseSummary);
  const candidate = readiness(candidateSummary);
  const delta = candidate.score - base.score;
  const lines = [
    '# Investor Artifact Readiness Trend',
    '',
    `Base summary: ${basePath}`,
    `Candidate summary: ${candidatePath}`,
    '',
    `Base score: ${base.score}/100`,
    `Candidate score: ${candidate.score}/100`,
    `Score delta: ${delta >= 0 ? '+' : ''}${delta}`,
    '',
    '| Dimension | Base | Candidate | Delta |',
    '| --- | ---: | ---: | ---: |',
  ];
  for (const key of Object.keys(base.deductions)) {
    const baseValue = base.deductions[key];
    const candidateValue = candidate.deductions[key];
    const diff = candidateValue - baseValue;
    lines.push(
      `| ${key} | ${baseValue} | ${candidateValue} | ${diff >= 0 ? '+' : ''}${diff} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const baseSummary = await readSummary(basePath);
  const candidateSummary = await readSummary(candidatePath);
  const report = buildTrendReport(baseSummary, candidateSummary);

  if (outputPath) {
    await writeFile(outputPath, report, 'utf8');
    console.log(`[investor-artifact-trend] wrote report to ${outputPath}`);
  } else {
    console.log(report);
  }
}

void main();
