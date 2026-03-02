import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { contractService } from '../services/contractService.js';

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (await contractService.isAdmin(req.user.address)) return next();
  res.status(403).json({ error: 'Forbidden: Admin role required' });
};

export const requireMinter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (await contractService.isMinter(req.user.address)) return next();
  res.status(403).json({ error: 'Forbidden: Minter role required' });
};

export const requireOracle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (await contractService.isAIOracle(req.user.address)) return next();
  res.status(403).json({ error: 'Forbidden: AI Oracle role required' });
};

export const requireGovernment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (await contractService.isGovernment(req.user.address)) return next();
  res.status(403).json({ error: 'Forbidden: Government role required' });
};

export const requireBin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.type === 'bin' || await contractService.isRegisteredBin(req.user.address)) return next();
  res.status(403).json({ error: 'Forbidden: Registered SmartBin required' });
};
