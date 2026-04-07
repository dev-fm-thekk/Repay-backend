import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rewardRoutes  from './routes/reward.js';
import agencyRoutes  from './routes/agency.js';
import serviceRoutes from './routes/service.js';
import ticketRoutes  from './routes/ticket.js';
import authRoutes    from './routes/auth.js';
import cookieParser  from 'cookie-parser';
import logger        from './utils/logger.js';

dotenv.config({ path: '.env.app' });

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Request Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Helper to handle BigInt in JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

// Routes
app.use('/auth',    authRoutes);
app.use('/reward',  rewardRoutes);
app.use('/agency',  agencyRoutes);
app.use('/service', serviceRoutes);
app.use('/ticket',  ticketRoutes);

app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
});
