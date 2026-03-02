import express from 'express';
import cors from 'cors';
import { authenticate, AuthRequest } from './middlewares/auth.js';
import authRoutes from './routes/auth.js';
import registryRoutes from './routes/registry.js';
import rewardsRoutes from './routes/rewards.js';
import marketplaceRoutes from './routes/marketplace.js';
import auctionRoutes from './routes/auction.js';
import ticketRoutes from './routes/tickets.js';
import { requireAdmin, requireBin } from './middlewares/rbac.js';
import morgan from 'morgan';
import logger, { stream } from './utils/logger.js';

const app = express();

app.use(cors());
app.use(express.json());

// Log all requests using morgan and winston
app.use(morgan('combined', { stream }));

// Routes
// Public Routes
app.use('/auth', authRoutes);
app.use('/registry', registryRoutes);
app.use('/rewards', rewardsRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/auctions', auctionRoutes);
app.use('/tickets', ticketRoutes);

// Compatibility / Legacy routes
app.use('/bins', rewardsRoutes); // Some docs use /bins instead of /rewards/bins
app.use('/tokens', rewardsRoutes); // Some docs use /tokens instead of /rewards/tokens


// Protected Routes examples
app.get('/profile', authenticate, (req: AuthRequest, res) => {
  res.json({
    message: 'Welcome!',
    user: req.user,
  });
});

// Example of a protected route using requireBin middleware
// This route would typically be defined in rewardsRoutes or similar,
// but is shown here for context of the requested change.
// Assuming a route like /rewards/bins/:address/tokens
app.get('/rewards/bins/:address/tokens', authenticate, requireBin, (req: AuthRequest, res) => {
  // This is where the original lint error might have occurred,
  // if req.user.address was not guaranteed to be a string.
  // The fix involves casting req.params.address to string before toLowerCase().
  // The actual logic for this route would go here.
  if (req.user?.type === 'bin' && (req.user.address as string).toLowerCase() !== (req.params.address as string).toLowerCase()) {
    return res.status(403).json({ error: 'Forbidden: Bin address mismatch' });
  }
  res.json({ message: `Access granted for bin: ${req.params.address}`, user: req.user });
});


// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`${req.method} ${req.url} - ${err.stack}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
