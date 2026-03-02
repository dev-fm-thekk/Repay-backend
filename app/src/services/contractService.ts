import { createPublicClient, http, parseAbi, Address, keccak256, stringToBytes } from 'viem';
import { mainnet, hardhat } from 'viem/chains';
import { env } from '../config/env.js';

const MINTER_ROLE = keccak256(stringToBytes('MINTER_ROLE'));
const ADMIN_ROLE = keccak256(stringToBytes('ADMIN_ROLE'));

const ECO_TOKEN_ABI = parseAbi([
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
]);

const SMART_BIN_ABI = parseAbi([
  'function admin() view returns (address)',
  'function aiOracle() view returns (address)',
  'function governmentWallet() view returns (address)',
  'function bins(address) view returns (address binAddress, string location, address operator, bool isActive, uint256 totalWeightProcessed, uint256 totalTokensDispensed)',
]);

const MATERIAL_AUCTION_ABI = parseAbi([
  'function verifiedRecyclers(address) view returns (bool)',
]);

export class ContractService {
  private client;

  constructor() {
    this.client = createPublicClient({
      chain: hardhat, // or use environment to decide
      transport: http(env.RPC_URL),
    });
  }

  async isAdmin(address: string): Promise<boolean> {
    try {
      // Check EcoToken ADMIN_ROLE
      const hasRole = await this.client.readContract({
        address: env.CONTRACTS.ECO_TOKEN as Address,
        abi: ECO_TOKEN_ABI,
        functionName: 'hasRole',
        args: [ADMIN_ROLE, address as Address],
      });
      if (hasRole) return true;

      // Check SmartBin admin
      const sbAdmin = await this.client.readContract({
        address: env.CONTRACTS.SMARTBIN as Address,
        abi: SMART_BIN_ABI,
        functionName: 'admin',
      });
      return sbAdmin.toLowerCase() === address.toLowerCase();
    } catch (e) {
      console.error('Error checking isAdmin:', e);
      return false;
    }
  }

  async isMinter(address: string): Promise<boolean> {
    try {
      return await this.client.readContract({
        address: env.CONTRACTS.ECO_TOKEN as Address,
        abi: ECO_TOKEN_ABI,
        functionName: 'hasRole',
        args: [MINTER_ROLE, address as Address],
      });
    } catch (e) {
      return false;
    }
  }

  async isAIOracle(address: string): Promise<boolean> {
    try {
      const oracle = await this.client.readContract({
        address: env.CONTRACTS.SMARTBIN as Address,
        abi: SMART_BIN_ABI,
        functionName: 'aiOracle',
      });
      return oracle.toLowerCase() === address.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  async isGovernment(address: string): Promise<boolean> {
    try {
      const gov = await this.client.readContract({
        address: env.CONTRACTS.SMARTBIN as Address,
        abi: SMART_BIN_ABI,
        functionName: 'governmentWallet',
      });
      return gov.toLowerCase() === address.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  async isVerifiedRecycler(address: string): Promise<boolean> {
    try {
      return await this.client.readContract({
        address: env.CONTRACTS.MATERIAL_AUCTION as Address,
        abi: MATERIAL_AUCTION_ABI,
        functionName: 'verifiedRecyclers',
        args: [address as Address],
      });
    } catch (e) {
      return false;
    }
  }

  async isRegisteredBin(address: string): Promise<boolean> {
    try {
      const binData = await this.client.readContract({
        address: env.CONTRACTS.SMARTBIN as Address,
        abi: SMART_BIN_ABI,
        functionName: 'bins',
        args: [address as Address],
      });
      // binAddress is the first element in the returned tuple
      return binData[0].toLowerCase() === address.toLowerCase() && binData[3] === true; // isActive is 4th element (index 3)
    } catch (e) {
      return false;
    }
  }
}

export const contractService = new ContractService();
