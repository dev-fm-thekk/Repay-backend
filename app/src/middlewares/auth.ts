import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export interface AuthRequest extends Request {
  user?: {
    address: string;
    type: 'user' | 'bin';
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  // Case 1: API Key for Smart Bins
  if (apiKey && typeof apiKey === 'string') {
    const address = env.API_KEYS[apiKey];
    if (address) {
      req.user = { address, type: 'bin' };
      return next();
    }
  }

  // Case 2: JWT for Users & Admin
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token or API key provided' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { address: string };
    req.user = { address: decoded.address, type: 'user' };
    next();
  } catch (err: any) {
    logger.error(`[Auth Middleware Error]: ${err.message}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid token', details: err.message });
  }
};
