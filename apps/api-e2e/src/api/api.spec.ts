import axios from 'axios';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';

describe('GET /api', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('Theme lifecycle (seed -> build -> install -> publish) + commerce + settings', () => {
  it('should support the happy path', async () => {
    const authEmail = `owner-${Date.now()}@example.com`;
    const authPassword = 'password123';
    const registerRes = await axios.post(`/api/auth/register`, {
      email: authEmail,
      password: authPassword,
      workspaceName: `workspace-${Date.now()}`,
    });
    expect(registerRes.status).toBe(201);

    const loginRes = await axios.post(`/api/auth/login`, {
      email: authEmail,
      password: authPassword,
    });
    expect(loginRes.status).toBe(201);
    expect(typeof loginRes.data.token).toBe('string');
    expect(typeof loginRes.data.refreshToken).toBe('string');

    const refreshRes = await axios.post(`/api/auth/refresh`, { refreshToken: loginRes.data.refreshToken });
    expect(refreshRes.status).toBe(201);
    expect(typeof refreshRes.data.token).toBe('string');
    expect(typeof refreshRes.data.refreshToken).toBe('string');

    const jwksRes = await axios.get(`/api/auth/jwks`);
    expect(jwksRes.status).toBe(200);
    expect(Array.isArray(jwksRes.data.keys)).toBe(true);

    const introspectRes = await axios.post(`/api/auth/introspect`, { token: refreshRes.data.token });
    expect(introspectRes.status).toBe(201);
    expect(introspectRes.data.active).toBe(true);

    const client = axios.create({
      headers: {
        Authorization: `Bearer ${refreshRes.data.token}`,
      },
    });

    // 1) Create a site
    const siteRes = await client.post(`/api/sites`, { name: `e2e-${Date.now()}` });
    expect(siteRes.status).toBe(201);
    const siteId = siteRes.data.id as string;
    expect(typeof siteId).toBe('string');

    // 1b) Domain mapping + verification (localhost fast-path)
    const domainRes = await client.post(`/api/domains`, { host: `demo-${Date.now()}.localhost`, siteId });
    expect(domainRes.status).toBe(201);
    const domainId = domainRes.data.id as string;
    expect(typeof domainId).toBe('string');

    const challengeRes = await client.post(`/api/domains/${domainId}/challenges`, { method: 'DNS_TXT' });
    expect(challengeRes.status).toBe(201);
    expect(challengeRes.data?.instructions?.type).toBe('DNS_TXT');

    const webhookRes = await client.post(`/api/domains/challenges/${challengeRes.data.id}/webhook`, {
      status: 'READY',
      provider: 'e2e',
      providerReferenceId: 'evt-1',
    });
    expect(webhookRes.status).toBe(201);

    const metricsRes = await client.get(`/api/domains/challenges/metrics`);
    expect(metricsRes.status).toBe(200);
    expect(typeof metricsRes.data.totalChallenges).toBe('number');

    const promMetricsRes = await client.get(`/api/domains/challenges/metrics/prometheus`);
    expect(promMetricsRes.status).toBe(200);
    expect(typeof promMetricsRes.data).toBe('string');
    expect(promMetricsRes.data).toContain('domain_challenges_total');

    const alertsRes = await client.get(`/api/domains/challenges/alerts?limit=10`);
    expect(alertsRes.status).toBe(200);
    expect(Array.isArray(alertsRes.data)).toBe(true);

    const pollRes = await client.post(`/api/domains/challenges/poll?limit=5`);
    expect(pollRes.status).toBe(201);
    expect(Array.isArray(pollRes.data?.processed)).toBe(true);

    const challengeVerifyRes = await client.post(`/api/domains/challenges/${challengeRes.data.id}/verify`);
    expect(challengeVerifyRes.status).toBe(201);
    expect(challengeVerifyRes.data?.challenge?.status).toBe('VERIFIED');

    const verifyDomainRes = await client.post(`/api/domains/${domainId}/verify`);
    expect(verifyDomainRes.status).toBe(201);
    expect(verifyDomainRes.data.status).toBe('VERIFIED');

    // 2) Seed default theme
    const seedRes = await client.post(`/api/themes/seed/default`);
    expect(seedRes.status).toBe(201);
    const themeVersionId = seedRes.data?.themeVersion?.id as string;
    expect(typeof themeVersionId).toBe('string');

    // 3) Build (async queue) + wait for completion
    const buildRes = await client.post(`/api/themes/versions/${themeVersionId}/build`);
    expect(buildRes.status).toBe(201);
    const jobId = buildRes.data.jobId as string;
    expect(typeof jobId).toBe('string');

    let jobStatus = 'QUEUED';
    for (let i = 0; i < 30; i++) {
      const jobRes = await client.get(`/api/themes/build-jobs/${jobId}`);
      jobStatus = jobRes.data.status;
      if (jobStatus === 'SUCCEEDED') break;
      if (jobStatus === 'FAILED') throw new Error(`Build failed: ${jobRes.data.error}`);
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(jobStatus).toBe('SUCCEEDED');

    // 4) Install + publish for site
    const themes = await client.get(`/api/themes`);
    const themeId = themes.data?.[0]?.id as string;
    expect(typeof themeId).toBe('string');

    const installRes = await client.post(`/api/sites/${siteId}/theme/install`, { themeId, themeVersionId });
    expect(installRes.status).toBe(201);

    const publishRes = await client.post(`/api/sites/${siteId}/theme/publish`, { themeVersionId, actor: 'e2e' });
    expect(publishRes.status).toBe(201);

    // 5) Settings (draft -> publish)
    const draftSettingsRes = await client.put(`/api/sites/${siteId}/theme/settings/draft`, {
      themeVersionId,
      settings: { brandName: 'E2E Brand' },
    });
    expect(draftSettingsRes.status).toBe(200);

    const publishSettingsRes = await client.post(`/api/sites/${siteId}/theme/settings/publish`, { themeVersionId });
    expect(publishSettingsRes.status).toBe(201);

    const settingsRes = await client.get(`/api/sites/${siteId}/theme/settings`);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.data.published.settings.brandName).toBe('E2E Brand');

    // 5b) Template layouts (draft -> publish) and ensure theme templates consume `layout`
    const draftLayoutRes = await client.put(`/api/sites/${siteId}/theme/layouts/draft`, {
      themeVersionId,
      templateId: 'pages/home',
      layout: {
        type: 'Container',
        id: 'root',
        children: [
          {
            type: 'HeroSection',
            id: 'hero-1',
            props: { title: 'E2E Hero Title', subtitle: 'E2E Subtitle' },
          },
        ],
        props: {},
      },
    });
    expect(draftLayoutRes.status).toBe(200);

    const publishLayoutRes = await client.post(`/api/sites/${siteId}/theme/layouts/publish`, { themeVersionId, templateId: 'pages/home' });
    expect(publishLayoutRes.status).toBe(201);

    // Validate the built theme bundle can render the layout prop (storefront uses same contract)
    const bundlePath = path.join(process.cwd(), 'storage', 'themes', themeVersionId, 'build', 'theme.cjs');
    expect(fs.existsSync(bundlePath)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(bundlePath);
    expect(mod?.templates?.['pages/home']).toBeTruthy();
    const homeExport = mod.templates['pages/home'];
    const Home = typeof homeExport === 'function' ? homeExport : homeExport?.default;
    expect(typeof Home).toBe('function');
    const html = renderToString(React.createElement(Home, { layout: draftLayoutRes.data?.draft?.layout || null }));
    expect(html).toContain('E2E Hero Title');

    // 6) Commerce (seed product, list products, cart add)
    const seedProdRes = await client.post(`/api/commerce/sites/${siteId}/products/seed`);
    expect(seedProdRes.status).toBe(201);
    const productId = seedProdRes.data.product?.id as string;
    expect(typeof productId).toBe('string');

    const listProdRes = await client.get(`/api/commerce/sites/${siteId}/products`);
    expect(listProdRes.status).toBe(200);
    expect(Array.isArray(listProdRes.data)).toBe(true);

    const cartAddRes = await client.post(`/api/commerce/sites/${siteId}/cart/lines`, { productId, quantity: 1 });
    expect(cartAddRes.status).toBe(201);
    expect(Array.isArray(cartAddRes.data.lines)).toBe(true);

    const logoutRes = await axios.post(`/api/auth/logout`, { refreshToken: refreshRes.data.refreshToken });
    expect(logoutRes.status).toBe(201);
    expect(logoutRes.data.status).toBe('LOGGED_OUT');
  }, 30000);
});
