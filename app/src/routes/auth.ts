import { Router, Request, Response } from 'express';
import { verifyMessage, Address } from 'viem';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import asyncHandler from 'express-async-handler';
import logger from '../utils/logger.js';
import { contractService } from '../services/contractService.js';

const router = Router();

/**
 * @route POST /auth/login
 * login with wallet address and signature
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    res.status(400).json({ error: 'Missing address or signature' });
    return;
  }

  // The message users sign in their wallet (simpler than SIWE)
  const message = `Login to Repay Network with address: ${address}`;
  logger.info(`Auth Login Attempt: address=${address}, signature=${signature ? signature.substring(0, 10) + '...' : 'undefined'}`);

  try {
    const isValid = await verifyMessage({
      address: address as Address,
      message,
      signature,
    });

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Fetch the primary role for the user
    const role = await contractService.getPrimaryRole(address);

    // Create JWT with address and role
    const token = jwt.sign(
      { address, role },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (err: any) {
    logger.error(`[Auth Login Error]: ${err.stack || err}`);
    res.status(401).json({ 
      error: 'Authentication failed', 
      details: err.message || String(err) 
    });
  }
}));

export default router;
