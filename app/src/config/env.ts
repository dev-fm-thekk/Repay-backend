import dotenv from 'dotenv';
import path from 'path';

// Load .env.app
dotenv.config({ path: path.join(process.cwd(), '.env.app') });

export const env = {
  PORT: process.env.PORT || 8000,
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret',
  SESSION_SECRET: process.env.SESSION_SECRET || 'fallback-siwe-secret',
  RPC_URL: process.env.SEPOLIA_RPC_URL || 'http://localhost:8545',
  CONTRACTS: {
    ECO_TOKEN: process.env.ECO_TOKEN_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    SMARTBIN: process.env.SMARTBIN_ADDRESS || '0xdc64a140aa3e981100a9beca4e685f962f0cf6c9',
    MARKETPLACE: process.env.MARKETPLACE_ADDRESS || '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9',
    MATERIAL_AUCTION: process.env.MATERIAL_AUCTION_ADDRESS || '0x5fc8d32690cc91d4c39d9d3abcbd16989f875707',
    PRODUCT_REGISTRY: process.env.PRODUCT_REGISTRY_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    TICKETS: process.env.TICKET_NFT_ADDRESS || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  },
  // Mapping for API Key -> Address
  API_KEYS: {
    [process.env.BIN_API_KEY_0 || 'bin-abc-123']: process.env.BIN_ADDRESS_0 || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  },
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // Hardhat account 0 default
};
