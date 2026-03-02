import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`-------------------------------------------`);
  console.log(`🚀 Repay Backend API Server  🚀`);
  console.log(`🔋 Port: ${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 RPC Node: ${env.RPC_URL}`);
  console.log(`-------------------------------------------`);
});
