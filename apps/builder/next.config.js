//@ts-check

/**
 * File: apps/builder/next.config.js
 * Module: builder
 * Purpose: Next.js config for the Builder app
 * Author: Cursor / Aman
 * Last-updated: 2025-12-16
 * Notes:
 * - Temporarily avoid Nx Next plugin because Turbopack attempts to bundle Nx internals and fails on optional deps.
 * - Nx still orchestrates builds/serves; this config focuses on runtime behavior (API rewrites).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
