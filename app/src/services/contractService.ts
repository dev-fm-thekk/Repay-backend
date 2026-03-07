import { createPublicClient, http, parseAbi, Address, keccak256, stringToBytes, createWalletClient } from 'viem';
import { hardhat, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const MINTER_ROLE = keccak256(stringToBytes('MINTER_ROLE'));
const ADMIN_ROLE = keccak256(stringToBytes('ADMIN_ROLE'));

const ECO_TOKEN_ABI = parseAbi([
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function balanceOf(address account) view returns (uint256)',
  'function rewardRates(string material) view returns (uint256)',
  'function calculateReward(uint256 weight, string material, uint256 confidence) view returns (uint256)',
  'function rewardHistory(uint256 index) view returns (uint256 productId, address user, uint256 tokensAwarded, bytes32 proofHash, uint256 timestamp)',
  'function totalMinted() view returns (uint256)',
]);

const SMART_BIN_ABI = parseAbi([
  'function admin() view returns (address)',
  'function aiOracle() view returns (address)',
  'function governmentWallet() view returns (address)',
  'function bins(address) view returns (address binAddress, string location, address operator, bool isActive, uint256 totalWeightProcessed, uint256 totalTokensDispensed)',
  'function registerBin(address binAddress, string location, address operator) external',
  'function processDrop(uint256 productId, address user, uint256 weight, string classification, uint256 confidenceScore, bytes32 proofHash) external',
]);
export { SMART_BIN_ABI };

export const MATERIAL_AUCTION_ABI = parseAbi([
  'function verifiedRecyclers(address) view returns (bool)',
  'function batchCounter() view returns (uint256)',
  'function batches(uint256) view returns (uint256 batchId, address binAddress, string materialType, uint256 estimatedWeight, uint256 minBidETH, uint256 auctionDeadline, uint8 status, address winner, uint256 winningBid)',
  'function registerRecycler(address recycler) external',
]);

export const PRODUCT_REGISTRY_ABI = parseAbi([
  'function admin() view returns (address)',
  'function companies(address) view returns (address wallet, string name, bool isVerified, uint256 registeredAt)',
  'function getProductInfo(uint256 productId) view returns ((uint256 productId, address companyWallet, string name, string category, string metadataURI, bool isRecycled, uint256 createdAt) product, (address wallet, string name, bool isVerified, uint256 registeredAt) company, (uint256 productId, address binAddress, uint256 weight, string classification, uint256 timestamp) recycleRecord, bool hasRecycleRecord)',
  'function registeredBins(address) view returns (bool)',
  'function registerCompany(string name, address wallet) external',
  'function verifyCompany(address company) external',
  'function registerProduct(address companyWallet, string name, string category, string metadataURI) external',
]);

export const MARKETPLACE_ABI = parseAbi([
  'function listingCounter() view returns (uint256)',
  'function listings(uint256) view returns (address seller, uint256 ecoTokenAmount, uint256 askPriceETH, bool active)',
]);

export const TICKET_NFT_ABI = parseAbi([
  'function transitAuthority() view returns (address)',
  'function tickets(uint256) view returns (uint256 ticketId, address owner, string routeId, string zone, uint8 class, uint8 mode, uint256 validFrom, uint256 validUntil, bool isUsed, bool isExpired, uint256 ecoCost, uint256 issuedAt)',
  'function balanceOf(address owner) view returns (uint256)',
  'function getUserTickets(address user) view returns (uint256[])',
  'function configureRoute(string routeId, uint8 mode, string zone, uint256 standardCostECO, uint256 premiumCostECO, uint256 validityDuration) external',
  'function updateTransitAuthority(address newAuthority) external',
]);


export class ContractService {
  public client;
  public walletClient;
  private adminAccount;

  constructor() {
    this.client = createPublicClient({
      chain: sepolia,
      transport: http(env.RPC_URL),
    });

    this.adminAccount = privateKeyToAccount(env.ADMIN_PRIVATE_KEY as Address);
    this.walletClient = createWalletClient({
      account: this.adminAccount,
      chain: sepolia,
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
      logger.error(`Error checking isAdmin: ${e}`);
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

  async isTransitAuthority(address: string): Promise<boolean> {
    try {
      const authority = await this.client.readContract({
        address: env.CONTRACTS.TICKETS as Address,
        abi: TICKET_NFT_ABI,
        functionName: 'transitAuthority',
      });
      return authority.toLowerCase() === address.toLowerCase();
    } catch (e) {
      return false;
    }
  }

  async isVerifiedCompany(address: string): Promise<boolean> {
    try {
      const company = await this.getCompany(address);
      return company[2]; // isVerified is the 3rd element
    } catch (e) {
      return false;
    }
  }

  // Registry Helpers
  async getCompany(address: string) {
    return await this.client.readContract({
      address: env.CONTRACTS.PRODUCT_REGISTRY as Address,
      abi: PRODUCT_REGISTRY_ABI,
      functionName: 'companies',
      args: [address as Address],
    });
  }

  async getProduct(id: bigint) {
    return await this.client.readContract({
      address: env.CONTRACTS.PRODUCT_REGISTRY as Address,
      abi: PRODUCT_REGISTRY_ABI,
      functionName: 'getProductInfo',
      args: [id],
    });
  }

  // Reward Helpers
  async getEcoBalance(address: string) {
    return await this.client.readContract({
      address: env.CONTRACTS.ECO_TOKEN as Address,
      abi: ECO_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address as Address],
    });
  }

  async calculateExpectedReward(weight: bigint, material: string, confidence: bigint) {
    return await this.client.readContract({
      address: env.CONTRACTS.ECO_TOKEN as Address,
      abi: ECO_TOKEN_ABI,
      functionName: 'calculateReward',
      args: [weight, material, confidence],
    });
  }

  async getRewardRate(material: string) {
    return await this.client.readContract({
      address: env.CONTRACTS.ECO_TOKEN as Address,
      abi: ECO_TOKEN_ABI,
      functionName: 'rewardRates',
      args: [material],
    });
  }

  // Auction Helpers
  async getAuction(id: bigint) {
    return await this.client.readContract({
      address: env.CONTRACTS.MATERIAL_AUCTION as Address,
      abi: MATERIAL_AUCTION_ABI,
      functionName: 'batches',
      args: [id],
    });
  }

  async getAuctionCount() {
    return await this.client.readContract({
      address: env.CONTRACTS.MATERIAL_AUCTION as Address,
      abi: MATERIAL_AUCTION_ABI,
      functionName: 'batchCounter',
    });
  }

  async getBin(address: string) {
    return await this.client.readContract({
      address: env.CONTRACTS.SMARTBIN as Address,
      abi: SMART_BIN_ABI,
      functionName: 'bins',
      args: [address as Address],
    });
  }

  // Write Functions (Using Admin/Relayer)
  async registerCompanyTransaction(name: string, wallet: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.PRODUCT_REGISTRY as Address,
      abi: PRODUCT_REGISTRY_ABI,
      functionName: 'registerCompany',
      args: [name, wallet as Address],
    });
  }

  async verifyCompanyTransaction(companyAddress: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.PRODUCT_REGISTRY as Address,
      abi: PRODUCT_REGISTRY_ABI,
      functionName: 'verifyCompany',
      args: [companyAddress as Address],
    });
  }

  async registerProductTransaction(companyWallet: string, name: string, category: string, metadataURI: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.PRODUCT_REGISTRY as Address,
      abi: PRODUCT_REGISTRY_ABI,
      functionName: 'registerProduct',
      args: [companyWallet as Address, name, category, metadataURI],
    });
  }

  async registerBinTransaction(binAddress: string, location: string, operator: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.SMARTBIN as Address,
      abi: SMART_BIN_ABI,
      functionName: 'registerBin',
      args: [binAddress as Address, location, operator as Address],
    });
  }

  async processDropTransaction(productId: bigint, user: string, weight: bigint, classification: string, confidenceScore: bigint, proofHash: string) {
    const txn = await this.walletClient.writeContract({
      address: env.CONTRACTS.SMARTBIN as Address,
      abi: SMART_BIN_ABI,
      functionName: 'processDrop',
      args: [productId, user as Address, weight, classification, confidenceScore, proofHash as `0x${string}`],
      gas: 500000n
    });

    const receipt = await this.client.waitForTransactionReceipt({ hash: txn });
    if (!receipt) return {
      error: "Transaction failed"
    }
    return receipt;
  }

  async registerRecyclerTransaction(recyclerAddress: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.MATERIAL_AUCTION as Address,
      abi: MATERIAL_AUCTION_ABI,
      functionName: 'registerRecycler',
      args: [recyclerAddress as Address],
    });
  }

  async configureRouteTransaction(routeId: string, mode: number, zone: string, standardCost: bigint, premiumCost: bigint, validity: bigint) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.TICKETS as Address,
      abi: TICKET_NFT_ABI,
      functionName: 'configureRoute',
      args: [routeId, mode, zone, standardCost, premiumCost, validity],
    });
  }

  async updateTransitAuthorityTransaction(newAuthority: string) {
    return await this.walletClient.writeContract({
      address: env.CONTRACTS.TICKETS as Address,
      abi: TICKET_NFT_ABI,
      functionName: 'updateTransitAuthority',
      args: [newAuthority as Address],
    });
  }

  async getPrimaryRole(address: string): Promise<string> {
    if (await this.isAdmin(address)) return 'ADMIN';
    if (await this.isGovernment(address)) return 'GOVERNMENT';
    if (await this.isTransitAuthority(address)) return 'TRANSIT_AUTHORITY';
    if (await this.isAIOracle(address)) return 'AI_ORACLE';
    if (await this.isMinter(address)) return 'MINTER';
    if (await this.isVerifiedRecycler(address)) return 'RECYCLER';
    if (await this.isVerifiedCompany(address)) return 'COMPANY';
    if (await this.isRegisteredBin(address)) return 'BIN';
    return 'USER';
  }
}

export const contractService = new ContractService();
