import express from 'express';
import cors from 'cors';
import { authenticate, AuthRequest } from './middlewares/auth.js';
import authRoutes from './routes/auth.js';
import { requireAdmin, requireBin } from './middlewares/rbac.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
// Public Routes
app.use('/auth', authRoutes);

// Protected Routes examples
app.get('/profile', authenticate, (req: AuthRequest, res) => {
  res.json({
    message: 'Welcome!',
    user: req.user,
  });
});

app.get('/admin/stats', authenticate, requireAdmin, (req, res) => {
  res.json({
    status: 'success',
    stats: {
      totalUsers: 100,
      totalWeightRecycled: 50000,
    }
  });
});

// SmartBin only route
app.post('/smartbin/process-drop', authenticate, requireBin, (req: AuthRequest, res) => {
  // Restriction: Bins using API keys are restricted to calling processDrop for their own address
  const { productId, userWallet, weight, classification, confidenceScore, proofHash } = req.body;
  
  // Logical check: if type is bin, it can only report for itself. User type (AI Oracle) can report for any bin.
  if (req.user?.type === 'bin') {
      // In a real implementation, we'd ensure msg.sender in contract matches req.user.address
      console.log(`Processing drop from bin ${req.user.address}`);
  }

  res.json({
    status: 'received',
    message: `Drop processed for product ${productId} from bin ${req.user?.address}`,
    data: { productId, weight, classification }
  });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
