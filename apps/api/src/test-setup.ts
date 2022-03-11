/**
 * File: apps/api/src/test-setup.ts
 * Module: app
 * Purpose: Jest test setup for API app (env defaults for deterministic unit tests)
 * Author: Cursor / Aman
 * Last-updated: 2026-01-24
 * Notes:
 * - Forces DB_TYPE=sqljs so entities use compatible column types in unit tests.
 */

process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqljs';

