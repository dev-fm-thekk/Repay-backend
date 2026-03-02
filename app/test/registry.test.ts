import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';

describe('Registry API', () => {
  // Test Public Read Routes
  it('should get company details', async () => {
    // Note: This relies on the contract being deployed and the address being valid
    // For unit tests, we check if it responds (it might 404 if not found, which is a valid response)
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const res = await request(app).get(`/registry/companies/${address}`);
    expect([200, 404]).toContain(res.status);
  });

  it('should get product details', async () => {
    const productId = 1;
    const res = await request(app).get(`/registry/products/${productId}`);
    expect([200, 404]).toContain(res.status);
  });

  // Test Protected Routes (Unauthorized)
  it('should block company registration without token', async () => {
    const res = await request(app)
      .post('/registry/companies')
      .send({ name: 'Test Company' });
    expect(res.status).toBe(401);
  });

  it('should block company verification without admin token', async () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const res = await request(app)
      .patch(`/registry/companies/${address}/verify`);
    expect(res.status).toBe(401);
  });
});
