import dotenv from 'dotenv';
import path from 'path';

// Load .env.app
dotenv.config({ path: path.join(process.cwd(), '.env.app') });

export const env = {
  PORT: process.env.PORT || 8000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-siwe-secret',
  RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
  CONTRACTS: {
    ECO_TOKEN: process.env.ECO_TOKEN_ADDRESS || '',
    SMARTBIN: process.env.SMARTBIN_ADDRESS || '',
    MARKETPLACE: process.env.MARKETPLACE_ADDRESS || '',
    MATERIAL_AUCTION: process.env.MATERIAL_AUCTION_ADDRESS || '',
  },
  // Mapping for API Key -> Address
  API_KEYS: {
    [process.env.BIN_API_KEY_0 || 'bin-abc-123']: process.env.BIN_ADDRESS_0 || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  }
};
