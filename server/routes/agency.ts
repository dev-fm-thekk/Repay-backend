import { Router } from 'express';
import { Address } from 'viem';
import { publicClient, walletClient, account, contractAddresses } from '../clients.js';
import { AgencyRegistryAbi } from '../abi.js';

import { authenticate, authorize, Role, AuthRequest } from '../middlewares/auth.js';

const router = Router();
const contractAddress = contractAddresses.agencyRegistry;

// ── Read Routes ──────────────────────────────────────────────────────────────

/**
 * @route GET /agency/total
 * @description Get total number of registered agencies
 */
router.get('/total', authenticate, async (req, res) => {
    try {
        const total = await publicClient.readContract({
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'totalAgencies'
        });
        res.json({ totalAgencies: total });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /agency/:id
 * @description Get full agency details by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id as string;
        const agency = await publicClient.readContract({
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'getAgency',
            args: [BigInt(id)]
        });
        res.json(agency);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /agency/wallet/:address
 * @description Get full agency details by operator wallet address
 */
router.get('/wallet/:address', authenticate, async (req, res) => {
    try {
        const address = req.params.address as Address;
        const agency = await publicClient.readContract({
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'getAgencyByWallet',
            args: [address]
        });
        res.json(agency);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /agency/active/:address
 * @description Check if a wallet address belongs to an active agency
 */
router.get('/active/:address', authenticate, async (req, res) => {
    try {
        const address = req.params.address as Address;
        const isActive = await publicClient.readContract({
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'isActiveAgency',
            args: [address]
        });
        res.json({ isActive });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ── Write Routes (Admin Only) ────────────────────────────────────────────────

/**
 * @route POST /agency/register
 * @body { name, shortCode, transport, wallet, metadataURI }
 * @description Register a new government transport agency (Admin only)
 *              transport: 0 = BUS, 1 = METRO, 2 = TRAIN
 */
router.post('/register', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const { name, shortCode, transport, wallet, metadataURI } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'registerAgency',
            args: [name, shortCode, transport, wallet as Address, metadataURI]
        });

        const hash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash, receipt });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /agency/:id/status
 * @body { status }
 * @description Activate or suspend an agency (Admin only)
 *              status: 0 = INACTIVE, 1 = ACTIVE
 */
router.put('/:id/status', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id as string;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'setAgencyStatus',
            args: [BigInt(id), status]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /agency/:id/wallet
 * @body { newWallet }
 * @description Update the operator wallet of an agency (Admin only)
 */
router.put('/:id/wallet', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const { newWallet } = req.body;
        const id = req.params.id as string;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'updateAgencyWallet',
            args: [BigInt(id), newWallet as Address]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        console.error("Service Create Error:", error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /agency/:id/metadata
 * @body { metadataURI }
 * @description Update the off-chain metadata URI for an agency (Admin only)
 */
router.put('/:id/metadata', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const { metadataURI } = req.body;
        const id = req.params.id as string;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: AgencyRegistryAbi,
            functionName: 'updateAgencyMetadata',
            args: [BigInt(id), metadataURI]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

