import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';

describe('Tickets API', () => {
  it('should get user tickets', async () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const res = await request(app).get(`/tickets/user/${address}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should block route configuration without auth', async () => {
    const res = await request(app)
      .post('/tickets/routes')
      .send({ routeId: 'BUS-1', mode: 0, zone: 'A', standardCost: 10, premiumCost: 20, validity: 3600 });
    expect(res.status).toBe(401);
  });
});
