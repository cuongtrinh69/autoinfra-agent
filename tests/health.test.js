/**
 * Health Endpoint Tests
 */

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/system/info', () => {
  it('should return system information', async () => {
    const res = await request(app).get('/api/system/info');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.info.name).toBe('AutoInfra Agent');
    expect(res.body.info).toHaveProperty('version');
  });
});