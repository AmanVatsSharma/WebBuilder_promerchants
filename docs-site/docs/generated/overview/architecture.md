---
sidebar_position: 2
---

# Architecture Overview

## High-level system

```mermaid
flowchart LR
  seller[Seller] --> builderApp[Next_Builder_Editor]
  buyer[Buyer] --> storefrontApp[Next_Storefront_SSR]

  builderApp --> api[Nest_API]
  storefrontApp --> api

  api --> db[(Postgres)]
  api --> storage[(StorageProvider)]
  api --> buildSvc[ThemeBuildService]
  buildSvc --> storage
  storefrontApp --> themeRuntime[ThemeRuntimeLoader]
  themeRuntime --> storage
```

## Core concepts
- **Sites/Pages**: sellers create Sites and Pages; layout JSON is stored in Postgres
- **Themes**: uploaded/seeded bundles stored in Storage; built into runtime artifacts
- **Domains**: map custom `Host` -> `siteId` for multi-tenant storefront routing
- **Editor actions**: every editor change can be represented as a typed command (future AI agent can call the same commands)


