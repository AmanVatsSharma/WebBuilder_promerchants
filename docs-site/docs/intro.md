---
sidebar_position: 1
---

# WebBuilder Docs

This docs site is generated from **in-repo module documentation** and curated overview pages.

## Quick Links
- [Architecture overview](./generated/overview/architecture.md)
- [Getting started](./generated/overview/getting-started.md)
- [API: Sites](./generated/modules/api/sites.md)
- [API: Themes](./generated/modules/api/themes.md)
- [API: Domains](./generated/modules/api/domains.md)
- [Default theme](./generated/modules/libs/default-theme.md)

## How docs are generated
We keep the **source of truth** inside each module as `MODULE_DOC.md`. Then we sync them into this site using:

```bash
npm run docs:sync
```

See `tools/docs-sync.mjs`.
