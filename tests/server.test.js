const request = require('supertest');
const app = require('../server');

describe('Jules API Proxy Server Routes', () => {
  test('GET / serve index.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /api/sessions without API Key should return error from upstream/proxy', async () => {
    const res = await request(app).get('/api/sessions');
    // Upstream API returns 401 when no api key is provided
    expect([401, 400, 500]).toContain(res.statusCode);
  });
});
