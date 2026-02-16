---
sidebar_position: 29
---

# Runbook: Investor Demo Artifact Capture

## Objective

Produce repeatable visual evidence (screenshots, short clips, logs) that proves the editor + theme platform story is stable and polished before investor calls.

## Naming convention (mandatory)

Use one naming format for every artifact:

`YYYYMMDD-HHMM-<chapter>-<surface>-v<revision>.<ext>`

Examples:

- `20260216-1840-ch1-dashboard-hero-v1.png`
- `20260216-1844-ch2-theme-studio-curation-v1.mp4`
- `20260216-1849-ch3-publish-center-release-v2.png`
- `20260216-1851-ch4-storefront-proof-v1.png`
- `20260216-1852-health-api-v1.log`

## Capture checklist by chapter

### Chapter 1 — Merchant command center

- Dashboard hero metrics visible (sites/pages/domains/verified).
- Project card showing release chips + shortcut analytics chips.
- Domain Ops Pulse cards and recent alert feed.
- Search/filter interaction in project list.

### Chapter 2 — Theme economy engine

- Theme Studio KPI header (total/listed/paid).
- Curation presets row with an active preset.
- Inventory focus chips interaction (failed/ready/listed pivots).
- Theme card with build-readiness and latest-version chips.

### Chapter 3 — Safe releases

- Publish Center readiness snapshot.
- Quick actions section (`Open Latest Editor`, `Open Live Storefront`).
- Inline success/error notice after publish or rollback action.
- Rollback selector + release history evidence.

### Chapter 4 — Storefront proof

- Storefront page showing published changes.
- If needed, fallback/basic shell capture proving graceful resilience behavior.

## Quality gates before sharing artifacts

1. **Consistency:** Use same browser zoom and viewport for all screenshots.
2. **Freshness:** Capture artifacts from the latest pushed commit only.
3. **Clarity:** Avoid cropped chips, hidden notices, or clipped CTAs.
4. **Traceability:** Keep one terminal log artifact with:
   - builder tests
   - builder build
   - docs build
5. **Versioning:** If a recapture is needed, increment `v<revision>`.

## Suggested terminal verification log sequence

```bash
npx nx test builder
npx nx build builder
npm run docs:build
```

Save the output as a timestamped `.log` artifact using the same naming convention.
