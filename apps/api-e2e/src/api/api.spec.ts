import axios from 'axios';

describe('GET /api', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('Theme lifecycle (seed -> build -> install -> publish) + commerce + settings', () => {
  it('should support the happy path', async () => {
    // 1) Create a site
    const siteRes = await axios.post(`/api/sites`, { name: `e2e-${Date.now()}` });
    expect(siteRes.status).toBe(201);
    const siteId = siteRes.data.id as string;
    expect(typeof siteId).toBe('string');

    // 2) Seed default theme
    const seedRes = await axios.post(`/api/themes/seed/default`);
    expect(seedRes.status).toBe(201);
    const themeVersionId = seedRes.data?.themeVersion?.id as string;
    expect(typeof themeVersionId).toBe('string');

    // 3) Build (async queue) + wait for completion
    const buildRes = await axios.post(`/api/themes/versions/${themeVersionId}/build`);
    expect(buildRes.status).toBe(201);
    const jobId = buildRes.data.jobId as string;
    expect(typeof jobId).toBe('string');

    let jobStatus = 'QUEUED';
    for (let i = 0; i < 30; i++) {
      const jobRes = await axios.get(`/api/themes/build-jobs/${jobId}`);
      jobStatus = jobRes.data.status;
      if (jobStatus === 'SUCCEEDED') break;
      if (jobStatus === 'FAILED') throw new Error(`Build failed: ${jobRes.data.error}`);
      await new Promise((r) => setTimeout(r, 250));
    }
    expect(jobStatus).toBe('SUCCEEDED');

    // 4) Install + publish for site
    const themes = await axios.get(`/api/themes`);
    const themeId = themes.data?.[0]?.id as string;
    expect(typeof themeId).toBe('string');

    const installRes = await axios.post(`/api/sites/${siteId}/theme/install`, { themeId, themeVersionId });
    expect(installRes.status).toBe(201);

    const publishRes = await axios.post(`/api/sites/${siteId}/theme/publish`, { themeVersionId, actor: 'e2e' });
    expect(publishRes.status).toBe(201);

    // 5) Settings (draft -> publish)
    const draftSettingsRes = await axios.put(`/api/sites/${siteId}/theme/settings/draft`, {
      themeVersionId,
      settings: { brandName: 'E2E Brand' },
    });
    expect(draftSettingsRes.status).toBe(200);

    const publishSettingsRes = await axios.post(`/api/sites/${siteId}/theme/settings/publish`, { themeVersionId });
    expect(publishSettingsRes.status).toBe(201);

    const settingsRes = await axios.get(`/api/sites/${siteId}/theme/settings`);
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.data.published.settings.brandName).toBe('E2E Brand');

    // 6) Commerce (seed product, list products, cart add)
    const seedProdRes = await axios.post(`/api/commerce/sites/${siteId}/products/seed`);
    expect(seedProdRes.status).toBe(201);
    const productId = seedProdRes.data.product?.id as string;
    expect(typeof productId).toBe('string');

    const listProdRes = await axios.get(`/api/commerce/sites/${siteId}/products`);
    expect(listProdRes.status).toBe(200);
    expect(Array.isArray(listProdRes.data)).toBe(true);

    const cartAddRes = await axios.post(`/api/commerce/sites/${siteId}/cart/lines`, { productId, quantity: 1 });
    expect(cartAddRes.status).toBe(201);
    expect(Array.isArray(cartAddRes.data.lines)).toBe(true);
  }, 30000);
});
