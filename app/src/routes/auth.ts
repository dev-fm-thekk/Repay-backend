import { Router, Request, Response } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import asyncHandler from 'express-async-handler';
import logger from '../utils/logger.js';

const router = Router();

// Store nonces for demo purposes
// In production, use express-session or a Redis cache
const nonces = new Map<string, string>();

/**
 * @route GET /auth/nonce
 */
router.get('/nonce', (req: Request, res: Response) => {
  const nonce = generateNonce();
  // We'll store it by a temporary ID (like a session ID) or just return it and expect it back in verify
  // For a stateless implementation, SIWE verify checks the nonce in the message.
  // However, we should keep track to prevent re-use
  // For now, simple return
  res.json({ nonce });
});

/**
 * @route POST /auth/verify
 */
router.post('/verify', asyncHandler(async (req: Request, res: Response) => {
  const { message, signature } = req.body;

  if (!message || !signature) {
    res.status(400).json({ error: 'Missing message or signature' });
    return;
  }

  try {
    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    // In a real app, verify the nonce matches the one we issued
    // if (fields.nonce !== expectedNonce) throw new Error('Invalid nonce');

    // Create JWT
    const token = jwt.sign(
      { address: fields.address },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (err: any) {
    logger.error(`[Auth Verify Error]: ${err.stack || err}`);
    res.status(401).json({ 
      error: 'Verification failed', 
      details: err.message || String(err) 
    });
  }
}));

export default router;
