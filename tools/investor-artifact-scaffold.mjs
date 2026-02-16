/**
 * File: tools/investor-artifact-scaffold.mjs
 * Module: investor-demo-ops
 * Purpose: Scaffold investor artifact slots with deterministic file names
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildCapturePlanMarkdown,
  captureChecklistRows,
  compactTimestamp,
  createSuggestedArtifactName,
  formatIstTimestamp,
} from './investor-artifact-utils.mjs';

const argv = process.argv.slice(2);
const dirArg = argv.find((arg) => arg.startsWith('--dir='));
const targetDir = dirArg ? path.resolve(dirArg.split('=')[1] || '') : '';
const stampArg = argv.find((arg) => arg.startsWith('--stamp='));
const stamp = stampArg?.split('=')[1] || compactTimestamp();
const dryRun = argv.includes('--dry-run');
const planArg = argv.find((arg) => arg.startsWith('--plan='));
const planPath = planArg ? path.resolve(planArg.split('=')[1] || '') : '';
const manifestArg = argv.find((arg) => arg.startsWith('--manifest='));
const manifestPath = manifestArg ? path.resolve(manifestArg.split('=')[1] || '') : '';

if (!targetDir) {
  console.error(
    '[investor-artifact-scaffold] missing required --dir argument. Example: --dir=/tmp/investor-artifacts',
  );
  process.exit(1);
}

async function readExistingNames(dir) {
  try {
    await access(dir);
    const entries = await readdir(dir, { withFileTypes: true });
    return new Set(entries.filter((item) => item.isFile()).map((item) => item.name));
  } catch {
    return new Set();
  }
}

function pickUniqueName(existingNames, chapter, surface, label, ext) {
  let revision = 1;
  let candidate = createSuggestedArtifactName(
    stamp,
    chapter,
    surface,
    label,
    ext,
    revision,
  );
  while (existingNames.has(candidate)) {
    revision += 1;
    candidate = createSuggestedArtifactName(
      stamp,
      chapter,
      surface,
      label,
      ext,
      revision,
    );
  }
  existingNames.add(candidate);
  return candidate;
}

function placeholderByExt(ext) {
  if (ext === 'json') {
    return JSON.stringify(
      { note: 'replace with exported curation JSON payload' },
      null,
      2,
    ).concat('\n');
  }
  if (ext === 'log') {
    return '# replace with demo verification terminal output\n';
  }
  return '';
}

async function main() {
  const existingNames = await readExistingNames(targetDir);
  const rows = captureChecklistRows();
  const planned = rows.map(([chapter, surface, label, ext]) => {
    const fileName = pickUniqueName(existingNames, chapter, surface, label, ext);
    return {
      chapter,
      surface,
      label,
      ext,
      fileName,
      absolutePath: path.join(targetDir, fileName),
    };
  });

  if (!dryRun) {
    await mkdir(targetDir, { recursive: true });
    for (const item of planned) {
      await writeFile(item.absolutePath, placeholderByExt(item.ext), 'utf8');
    }
  }

  if (planPath) {
    await writeFile(planPath, buildCapturePlanMarkdown(stamp), 'utf8');
    console.log(`[investor-artifact-scaffold] wrote capture plan to ${planPath}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    generatedAtIst: formatIstTimestamp(),
    dryRun,
    targetDir,
    stamp,
    files: planned.map((item) => ({
      chapter: item.chapter,
      surface: item.surface,
      label: item.label,
      fileName: item.fileName,
    })),
  };

  if (manifestPath) {
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    console.log(`[investor-artifact-scaffold] wrote scaffold manifest to ${manifestPath}`);
  }

  console.log('[investor-artifact-scaffold] summary', {
    dryRun,
    targetDir,
    files: planned.length,
  });
}

void main();
