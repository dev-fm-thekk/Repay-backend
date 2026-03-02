import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';

describe('Auctions API', () => {
  it('should list auctions', async () => {
    const res = await request(app).get('/auctions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get recycler verification status', async () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const res = await request(app).get(`/auctions/recyclers/${address}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isVerified');
  });

  it('should block recycler registration without admin token', async () => {
    const res = await request(app)
      .post('/auctions/recyclers')
      .send({ address: '0x...' });
    expect(res.status).toBe(401);
  });
});
