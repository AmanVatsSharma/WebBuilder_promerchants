---
sidebar_position: 27
---

# Runbook: Domain Challenge Operations (SLO + Alerts)

## Purpose

Track and operate domain verification challenge health using:

- JSON metrics endpoint
- Prometheus metrics endpoint
- Alert delivery history endpoint
- optional outbound alert webhook sink

## Key endpoints

- `GET /api/domains/challenges/metrics`
- `GET /api/domains/challenges/metrics/prometheus`
- `GET /api/domains/challenges/alerts?limit=100`

## Recommended SLO monitors

1. **Verification success rate**
   - metric: `domain_challenges_success_rate`
   - warning threshold: `< 0.90`
   - critical threshold: `< 0.75`
2. **Exhausted retries**
   - metric: `domain_challenges_exhausted_total`
   - alert when non-zero
3. **Undelivered alerts**
   - metric: `domain_challenge_alerts_undelivered_total`
   - alert when non-zero for > 10m

## Alert sink configuration

Set:

```bash
DOMAIN_CHALLENGE_ALERT_WEBHOOK_URL=https://alerts.internal.example/hooks/domain
```

Payload shape:

```json
{
  "event": "domain.challenge.failed",
  "challengeId": "uuid",
  "mappingId": "uuid",
  "reason": "text",
  "timestamp": "iso-8601"
}
```

## Dashboard starter query ideas

- total challenges: `domain_challenges_total`
- verified: `domain_challenges_verified_total`
- failed: `domain_challenges_failed_total`
- due retries: `domain_challenges_retry_due_total`
- exhausted retries: `domain_challenges_exhausted_total`

## Triage checklist

1. Verify scheduler enabled (`DOMAIN_CHALLENGE_SCHEDULER_ENABLED=true`).
2. Check retry backlog (`domain_challenges_retry_due_total`).
3. Inspect recent alert records via `/api/domains/challenges/alerts`.
4. Confirm provider webhook events are arriving for affected challenges.
