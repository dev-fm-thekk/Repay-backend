import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
    createPublicClient,
    createWalletClient,
    http,
    parseUnits,
    formatUnits,
    Hex,
    Address
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, hardhat } from 'viem/chains';
import { RewardTokenAbi } from './abi.js';

dotenv.config({ path: '.env.app' });

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Chain and Clients
const chain = process.env.NODE_ENV === 'production' ? sepolia : hardhat;
const account = privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY as Hex);

const publicClient = createPublicClient({
    chain,
    transport: http(process.env.RPC_URL)
});

const walletClient = createWalletClient({
    account,
    chain,
    transport: http(process.env.RPC_URL)
});

const contractAddress = process.env.REWARD_TOKEN as Address;

// Helper to handle BigInt in JSON
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

/**
 * @route GET /reward/info
 * @description Get basic token information (name, symbol, decimals, totalSupply, owner)
 */
app.get('/reward/info', async (req, res) => {
    try {
        const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
            publicClient.readContract({ address: contractAddress, abi: RewardTokenAbi, functionName: 'name' }),
            publicClient.readContract({ address: contractAddress, abi: RewardTokenAbi, functionName: 'symbol' }),
            publicClient.readContract({ address: contractAddress, abi: RewardTokenAbi, functionName: 'decimals' }),
            publicClient.readContract({ address: contractAddress, abi: RewardTokenAbi, functionName: 'totalSupply' }),
            publicClient.readContract({ address: contractAddress, abi: RewardTokenAbi, functionName: 'owner' })
        ]);
        res.json({ name, symbol, decimals, totalSupply: formatUnits(totalSupply, decimals), owner });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/balance/:address
 * @description Get token balance for a specific address
 */
app.get('/reward/balance/:address', async (req, res) => {
    try {
        const balance = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'balanceOf',
            args: [req.params.address as Address]
        });
        res.json({ balance: formatUnits(balance, 18), raw: balance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/allowance/:owner/:spender
 * @description Get allowance granted to a spender by an owner
 */
app.get('/reward/allowance/:owner/:spender', async (req, res) => {
    try {
        const allowance = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'allowance',
            args: [req.params.owner as Address, req.params.spender as Address]
        });
        res.json({ allowance: formatUnits(allowance, 18), raw: allowance });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/rates/:type
 * @description Get the reward rate for a specific WasteType (0: Plastic, 1: E-Waste, 2: Paper)
 */
app.get('/reward/rates/:type', async (req, res) => {
    try {
        const rate = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'rates',
            args: [parseInt(req.params.type)]
        });
        res.json({ rate: formatUnits(rate, 18), raw: rate });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/records/:address/count
 * @description Get the number of recycling records for a user
 */
app.get('/reward/records/:address/count', async (req, res) => {
    try {
        const count = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'getRecordCount',
            args: [req.params.address as Address]
        });
        res.json({ count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/records/:address/:index
 * @description Get a specific recycling record for a user by index
 */
app.get('/reward/records/:address/:index', async (req, res) => {
    try {
        const record = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'userRecords',
            args: [req.params.address as Address, BigInt(req.params.index)]
        });

        res.json({
            classification: record[0],
            confidenceScore: record[1],
            wasteType: record[2],
            weight: record[3],
            proofHash: record[4],
            timestamp: record[5]
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /reward/mint
 * @body { to, classification, confidenceScore, wasteType, weight, proofHash }
 * @description Mint rewards for recycling (Only Owner)
 */
app.post('/reward/mint', async (req, res) => {
    try {
        const { to, classification, confidenceScore, wasteType, weight, proofHash } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'mintReward',
            args: [to as Address, classification, BigInt(confidenceScore), wasteType, BigInt(weight), proofHash as Hex]
        });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash, receipt });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /reward/transfer
 * @body { to, amount }
 * @description Transfer tokens from the admin account
 */
app.post('/reward/transfer', async (req, res) => {
    try {
        const { to, amount } = req.body;
        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'transfer',
            args: [to as Address, parseUnits(amount.toString(), 18)]
        });
        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /reward/rate
 * @body { wasteType, newRate }
 * @description Update the reward rate for a specific waste type (Only Owner)
 */
app.put('/reward/rate', async (req, res) => {
    try {
        const { wasteType, newRate } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'setRate',
            args: [wasteType, parseUnits(newRate.toString(), 18)]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /reward/ownership/transfer
 * @body { newOwner }
 * @description Transfer ownership of the contract (Only Owner)
 */
app.post('/reward/ownership/transfer', async (req, res) => {
    try {
        const { newOwner } = req.body;
        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'transferOwnership',
            args: [newOwner as Address]
        });
        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });
        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
