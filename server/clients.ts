import {
    createPublicClient,
    createWalletClient,
    http,
    Hex,
    Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, hardhat } from 'viem/chains';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.app' });

export const chain = process.env.NODE_ENV === 'production' ? sepolia : hardhat;
export const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as Hex);

export const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL)
});

export const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL)
});

export const contractAddresses = {
    rewardToken: process.env.REWARD_TOKEN as Address,
    agencyRegistry: process.env.AGENCY_REGISTRY as Address,
    serviceRegistry: process.env.SERVICE_REGISTRY as Address,
    ticketNFT: process.env.TICKET_NFT as Address,
};
