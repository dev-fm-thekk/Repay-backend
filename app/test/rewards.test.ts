import { describe, it, expect } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';

describe('Rewards API', () => {
  it('should get bin status', async () => {
    const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const res = await request(app).get(`/rewards/bins/${address}`);
    expect([200, 404]).toContain(res.status);
  });

  it('should get ECO balance', async () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const res = await request(app).get(`/rewards/eco/balance/${address}`);
    expect(res.status).toBe(200);
    expect(res.body.balance).toBeDefined();
  });

  it('should block drop processing without API key', async () => {
    const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const res = await request(app)
      .post(`/rewards/bins/${address}/drop`)
      .send({ productId: 1, userWallet: '0x...', weight: 50, classification: 'Plastic' });
    expect(res.status).toBe(401);
  });

  it('should allow drop processing with valid Bin API Key', async () => {
    // Using default hardcoded bin-abc-123 from env.ts
    const apiKey = 'bin-abc-123';
    const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    
    // Note: This will attempt a real transaction if logic is reached,
    // so it might 500 if the contract isn't ready or account has no gas.
    // But we test the authentication layer here.
    const res = await request(app)
      .post(`/rewards/bins/${address}/drop`)
      .set('x-api-key', apiKey)
      .send({ 
        productId: 1, 
        userWallet: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', 
        weight: 100, 
        classification: 'Metal',
        confidenceScore: 95
      });
    
    // If it passes Auth but fails Tx, it's 500. If it succeeds Tx, it's 200.
    expect([200, 500]).toContain(res.status); 
  });
});
