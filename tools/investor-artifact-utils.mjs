/**
 * File: tools/investor-artifact-utils.mjs
 * Module: investor-demo-ops
 * Purpose: Shared helpers for investor artifact planning and validation
 * Author: Cursor / Aman
 * Last-updated: 2026-02-16
 */

export const INVESTOR_PLACEHOLDER_MARKER = '[INVESTOR_PLACEHOLDER]';

export function compactTimestamp(now = new Date()) {
  const year = `${now.getFullYear()}`;
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hours = `${now.getHours()}`.padStart(2, '0');
  const mins = `${now.getMinutes()}`.padStart(2, '0');
  return `${year}${month}${day}-${hours}${mins}`;
}

export function formatIstTimestamp(value = new Date()) {
  return value.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });
}

export function captureChecklistRows() {
  return [
    ['ch1', 'dashboard', 'hero-metrics', 'png'],
    ['ch1', 'dashboard', 'project-card-release-context', 'png'],
    ['ch1', 'dashboard', 'domain-ops-pulse', 'png'],
    ['ch2', 'theme-studio', 'curation-presets', 'png'],
    ['ch2', 'theme-studio', 'inventory-focus', 'png'],
    ['ch2', 'theme-studio', 'theme-card-readiness', 'png'],
    ['ch2', 'theme-studio', 'curation-import-confirmation', 'png'],
    ['ch3', 'publish-center', 'release-snapshot', 'png'],
    ['ch3', 'publish-center', 'quick-actions', 'png'],
    ['ch3', 'publish-center', 'rollback-history', 'png'],
    ['ch4', 'storefront', 'published-proof', 'png'],
    ['ops', 'terminal', 'demo-verify-log', 'log'],
    ['ops', 'theme-studio', 'curation-export-json', 'json'],
  ];
}

export function artifactNamePattern() {
  return /^\d{8}-\d{4}-[a-z0-9-]+-v\d+\.(png|mp4|log|json)$/i;
}

export function createSuggestedArtifactName(
  generatedAt,
  chapter,
  surface,
  label,
  ext,
  revision = 1,
) {
  return `${generatedAt}-${chapter}-${surface}-${label}-v${revision}.${ext}`;
}

export function buildCapturePlanMarkdown(generatedAt) {
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
    const suggested = createSuggestedArtifactName(
      generatedAt,
      chapter,
      surface,
      label,
      ext,
    );
    lines.push(`- [ ] ${chapter.toUpperCase()} ${surface} — ${label} -> \`${suggested}\``);
  }
  lines.push('', '## Notes', '', '- Keep viewport and zoom consistent across captures.');
  lines.push('- Regenerate plan if demo flow significantly changes.');
  return `${lines.join('\n')}\n`;
}

export function buildArtifactCoverageMarkdown(artifactValidation) {
  const lines = [
    '# Investor Artifact Coverage Report',
    '',
    `Directory: ${artifactValidation.directory}`,
    `Coverage: ${artifactValidation.covered}/${artifactValidation.required}`,
    `Unexpected named files: ${artifactValidation.unexpectedFiles?.length || 0}`,
    `Non-conforming files: ${artifactValidation.nonConformingFiles?.length || 0}`,
    `Placeholder files: ${artifactValidation.placeholderFiles?.length || 0}`,
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
  if (artifactValidation.unexpectedFiles?.length) {
    lines.push('', '## Unexpected named files');
    for (const fileName of artifactValidation.unexpectedFiles) {
      lines.push(`- ${fileName}`);
    }
  }
  if (artifactValidation.nonConformingFiles?.length) {
    lines.push('', '## Non-conforming files');
    for (const fileName of artifactValidation.nonConformingFiles) {
      lines.push(`- ${fileName}`);
    }
  }
  if (artifactValidation.placeholderFiles?.length) {
    lines.push('', '## Placeholder files');
    for (const fileName of artifactValidation.placeholderFiles) {
      lines.push(`- ${fileName}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
