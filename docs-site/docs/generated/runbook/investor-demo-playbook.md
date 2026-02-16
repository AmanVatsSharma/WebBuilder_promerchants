---
sidebar_position: 28
---

# Runbook: Investor Demo Playbook (Editor + Theme Platform)

## Objective

Run a polished 10-15 minute demo showing:

1. premium editor experience,
2. theme developer ecosystem workflow,
3. domain operations reliability posture.

## Pre-demo checklist (15 minutes before call)

1. Start stack and verify:
   - API `GET /api/health`
   - Builder route loads
   - Storefront route loads
2. Seed baseline:
   - `npm run mvp:seed`
3. Verify baseline:
   - `npm run mvp:validate`
4. Open these tabs in advance:
   - `/` (dashboard)
   - `/themes` (Theme Studio)
   - `/sites/<siteId>/publish` (Publish Center)
   - storefront URL

## Demo story arc

### Chapter 1 — “Merchant command center” (Dashboard)

- Show premium hero metrics (sites/pages/domains/verified).
- Show project search/filter.
- Create a site and page from inline forms.
- Add domain mapping and trigger verify.
- Highlight Domain Ops Pulse cards and recent alert feed.

**Talking point:** “Operations visibility is built into the builder, not bolted on.”

### Chapter 2 — “Theme economy engine” (Theme Studio)

- Show Theme Studio KPIs.
- Filter by listing/pricing quickly.
- Upload theme bundle with marketplace metadata.
- Open version editor from theme inventory card.

**Talking point:** “Developers can package and monetize themes with first-class metadata.”

### Chapter 3 — “Safe releases” (Publish Center)

- Show readiness snapshot (build/templates/pages).
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
