---
sidebar_position: 28
---

# Runbook: Investor Demo Playbook (Editor + Theme Platform)

## Objective

Run a polished 10-15 minute demo showing:

1. premium editor experience,
2. theme developer ecosystem workflow,
3. domain operations reliability posture.

For repeatable evidence packaging, use the companion runbook:

- [Investor Demo Artifact Capture](./investor-demo-artifact-capture)

## Pre-demo checklist (15 minutes before call)

1. Start stack and verify:
   - API `GET /api/health`
   - Builder route loads
   - Storefront route loads
2. Seed baseline:
   - `npm run mvp:seed`
3. Verify baseline:
   - `npm run mvp:validate`
4. Run investor verification bundle:
   - `npm run demo:artifact:verify`
   - optional prefilled checklist: `npm run demo:artifact:plan -- --capture-plan=/tmp/investor-demo-capture-plan.md`
   - optional placeholder slots: `npm run demo:artifact:scaffold -- --dir=/tmp/investor-artifacts`
5. Open these tabs in advance:
   - `/` (dashboard)
   - `/themes` (Theme Studio)
   - `/sites/<siteId>/publish` (Publish Center)
   - storefront URL
6. Prepare artifact naming and chapter capture checklist:
   - follow [Investor Demo Artifact Capture](./investor-demo-artifact-capture)
7. If artifacts already captured, validate pack completeness:
   - `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-strict`
   - or use strict audit profile: `npm run demo:artifact:audit -- --artifact-dir=/tmp/investor-artifacts`
   - include hygiene gate when needed: `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-strict --artifact-strict-extra`
   - include placeholder gate when scaffolds are disallowed: `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-strict --artifact-strict-placeholders`
   - include content gate for payload quality: `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-strict --artifact-strict-content`
   - optional shareable report: `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-report-md=/tmp/investor-artifact-coverage.md`
   - optional JSON manifest for archive pipelines: `npm run demo:artifact:verify -- --dry-run --artifact-dir=/tmp/investor-artifacts --artifact-manifest=/tmp/investor-artifact-manifest.json`
   - target readiness score guideline: `90+` before sharing externally.

## Demo story arc

### Chapter 1 — “Merchant command center” (Dashboard)

- Show premium hero metrics (sites/pages/domains/verified).
- Show project search/filter.
- Show per-site release context chips (`Published theme`, `Last release`) for operator confidence.
- Show shortcut analytics signals (`Shortcut clicks` chip + `Shortcut totals`) and optional export button.
- Create a site and page from inline forms.
- Add domain mapping and trigger verify.
- Highlight Domain Ops Pulse cards and recent alert feed.

**Talking point:** “Operations visibility is built into the builder, not bolted on.”

### Chapter 2 — “Theme economy engine” (Theme Studio)

- Show Theme Studio KPIs.
- Use curation presets (`Investor demo`, `Revenue-first`) to show instant inventory storytelling pivots.
- Use inventory focus chips (`Ready builds`, `Failed builds`, `Listed themes`) to show one-click triage and merchandising views.
- Demonstrate curation export/import loop and confirm restored view via inline success notice.
- Upload theme bundle with marketplace metadata.
- Open version editor from theme inventory card.

**Talking point:** “Developers can package and monetize themes with first-class metadata.”

### Chapter 3 — “Safe releases” (Publish Center)

- Show readiness snapshot (build/templates/pages).
- Use quick actions (`Open Latest Editor`, `Open Live Storefront`) for fast validation loops.
- Publish settings/layout/pages.
- Show non-blocking inline notices during each action.
- Show rollback selector + history feed.

**Talking point:** “Release governance and rollback are first-class merchant workflows.”

### Chapter 4 — “Proof on storefront”

- Open storefront and demonstrate published changes visible.

**Talking point:** “Editor actions map cleanly to storefront output.”

## Risk handling script

- If a domain verify fails, show ops pulse + alert visibility as intentional resilience path.
- If upload fails, show inline error notice and retry without reloading.
- If publish fails, demonstrate rollback path and audit history.

## Success criteria

- No blocking modals/alerts needed for normal flow.
- Every major operation shows immediate inline feedback.
- End-to-end story lands: build → publish → storefront proof.
