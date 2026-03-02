import app from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`-------------------------------------------`);
  logger.info(`🚀 Repay Backend API Server  🚀`);
  logger.info(`🔋 Port: ${PORT}`);
  logger.info(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔌 RPC Node: ${env.RPC_URL}`);
  logger.info(`-------------------------------------------`);
});
