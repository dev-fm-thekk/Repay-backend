import { describe, it, expect, beforeAll } from 'bun:test';
import request from 'supertest';
import app from '../src/app.js';
import { SiweMessage, generateNonce } from 'siwe';
import { privateKeyToAccount } from 'viem/accounts';

describe('Auth API', () => {
  let nonce: string;
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat account 0
  const account = privateKeyToAccount(privateKey);

  it('should get a nonce', async () => {
    const res = await request(app).get('/auth/nonce');
    expect(res.status).toBe(200);
    expect(res.body.nonce).toBeDefined();
    nonce = res.body.nonce;
  });

  it('should verify signature and return a token', async () => {
    const domain = 'localhost';
    const origin = 'http://localhost:3000';
    
    const siweMessage = new SiweMessage({
      domain,
      address: account.address,
      statement: 'Sign in with Ethereum to the Repay Backend.',
      uri: origin,
      version: '1',
      chainId: 1337,
      nonce
    });

    const message = siweMessage.prepareMessage();
    const signature = await account.signMessage({ message });

    const res = await request(app)
      .post('/auth/verify')
      .send({ message, signature });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should fail with invalid signature', async () => {
    const res = await request(app)
      .post('/auth/verify')
      .send({ message: 'invalid', signature: '0x' });

    expect(res.status).toBe(401);
  });
});
