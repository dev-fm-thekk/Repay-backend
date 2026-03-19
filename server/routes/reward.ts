import { Router } from 'express';
import { parseUnits, formatUnits, Hex, Address } from 'viem';
import { publicClient, walletClient, account, contractAddresses } from '../clients.js';
import { RewardTokenAbi } from '../abi.js';

import { authenticate, authorize, Role, AuthRequest } from '../middlewares/auth.js';
import logger from '../utils/logger.js';

const router = Router();
const contractAddress = contractAddresses.rewardToken;

// ── Read Routes ──────────────────────────────────────────────────────────────

/**
 * @route GET /reward/info
 * @description Get basic token information (name, symbol, decimals, totalSupply, owner)
 */
router.get('/info', authenticate, async (req, res) => {
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
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/balance/:address
 * @description Get token balance for a specific address
 */
router.get('/balance/:address', authenticate, async (req: AuthRequest, res) => {
    try {
        const address = req.params.address as Address;
        // Only allow users to see their own balance, or admins to see anyone's
        if (req.user?.role !== Role.ADMIN && req.user?.address.toLowerCase() !== address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: You can only view your own balance' });
            return;
        }

        const balance = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'balanceOf',
            args: [address]
        });
        res.json({ balance: formatUnits(balance, 18), raw: balance });
    } catch (error: any) {
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/allowance/:owner/:spender
 * @description Get allowance granted to a spender by an owner
 */
router.get('/allowance/:owner/:spender', authenticate, async (req: AuthRequest, res) => {
    try {
        const owner = req.params.owner as string;
        const spender = req.params.spender as string;
        
        // Only allow owner/spender to see the allowance, or admin
        if (req.user?.role !== Role.ADMIN && 
            req.user?.address.toLowerCase() !== owner.toLowerCase() && 
            req.user?.address.toLowerCase() !== spender.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }

        const allowance = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'allowance',
            args: [owner as Address, spender as Address]
        });
        res.json({ allowance: formatUnits(allowance, 18), raw: allowance });
    } catch (error: any) {
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/rates/:type
 * @description Get the reward rate for a specific WasteType (0: Plastic, 1: E-Waste, 2: Paper)
 */
router.get('/rates/:type', authenticate, async (req, res) => {
    try {
        const typeStr = req.params.type as string;
        const rate = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'rates',
            args: [parseInt(typeStr)]
        });
        res.json({ rate: formatUnits(rate, 18), raw: rate });
    } catch (error: any) {
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/records/:address/count
 * @description Get the number of recycling records for a user
 */
router.get('/records/:address/count', authenticate, async (req: AuthRequest, res) => {
    try {
        const address = req.params.address as Address;
        if (req.user?.role !== Role.ADMIN && req.user?.address.toLowerCase() !== address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: You can only view your own records' });
            return;
        }

        const count = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'getRecordCount',
            args: [address]
        });
        res.json({ count });
    } catch (error: any) {
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /reward/records/:address/:index
 * @description Get a specific recycling record for a user by index
 */
router.get('/records/:address/:index', authenticate, async (req: AuthRequest, res) => {
    try {
        const address = req.params.address as Address;
        const indexStr = req.params.index as string;

        if (req.user?.role !== Role.ADMIN && req.user?.address.toLowerCase() !== address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: You can only view your own records' });
            return;
        }

        const record = await publicClient.readContract({
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'userRecords',
            args: [address, BigInt(indexStr)]
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
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

// ── Write Routes ─────────────────────────────────────────────────────────────

/**
 * @route POST /reward/mint
 * @body { to, classification, confidenceScore, wasteType, weight, proofHash }
 * @description Mint rewards for recycling (Only Admin)
 */
router.post('/mint', authenticate , async (req, res) => {
    try {
        const { to, classification, confidenceScore, wasteType, weight, proofHash } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: RewardTokenAbi,
            functionName: 'mintReward',
            // Contract: (to, string _classification, uint256 _confidence, uint8 _wasteType, uint256 _weight, bytes32 _proof)
            // Frontend: Sends 'classification' as the category index and 'wasteType' as the description string.
            args: [
                to as Address, 
                wasteType, // Map description string to contract's classification parameter
                BigInt(confidenceScore), 
                classification, // Map category index to contract's wasteType parameter
                BigInt(weight), 
                proofHash as Hex
            ]
        });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        logger.info(`Tokens minted successfully. To: ${to}, Amount: ${weight}, TX: ${hash}`);

        res.json({ success: true, transactionHash: hash, receipt });
    } catch (error: any) {
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /reward/transfer
 * @body { to, amount }
 * @description Transfer tokens from the admin account (Only Admin)
 */
router.post('/transfer', authenticate, authorize([Role.ADMIN]), async (req, res) => {
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
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /reward/rate
 * @body { wasteType, newRate }
 * @description Update the reward rate for a specific waste type (Only Admin)
 */
router.put('/rate', authenticate, authorize([Role.ADMIN]), async (req, res) => {
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
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /reward/ownership/transfer
 * @body { newOwner }
 * @description Transfer ownership of the contract (Only Admin)
 */
router.post('/ownership/transfer', authenticate, authorize([Role.ADMIN]), async (req, res) => {
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
        logger.error(`Error in reward route: ${error.message}`, { stack: error.stack });
        res.status(500).json({ error: error.message });
    }
});

export default router;

