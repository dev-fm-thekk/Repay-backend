import { Router } from 'express';
import { parseUnits, formatUnits, createWalletClient, http, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClient, walletClient, account, chain, contractAddresses } from '../clients.js';
import { ServiceRegistryAbi } from '../abi.js';

import { authenticate, authorize, Role, AuthRequest } from '../middlewares/auth.js';

const router = Router();
const contractAddress = contractAddresses.serviceRegistry;

// ── Read Routes ──────────────────────────────────────────────────────────────

/**
 * @route GET /service/total
 * @description Get total number of registered services
 */
router.get('/total', async (req, res) => {
    try {
        const total = await publicClient.readContract({
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'totalServices'
        });
        res.json({ totalServices: total });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /service/:id
 * @description Get full service details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id as string;
        const service = await publicClient.readContract({
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'getService',
            args: [BigInt(id)]
        });
        res.json(service);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /service/:id/price
 * @description Get the token price for a service
 */
router.get('/:id/price', authenticate, async (req, res) => {
    try {
        const id = req.params.id as string;
        const price = await publicClient.readContract({
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'getPrice',
            args: [BigInt(id)]
        });
        res.json({ price: formatUnits(price, 18), raw: price });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /service/:id/available
 * @description Check if a service is currently purchasable
 */
router.get('/:id/available', authenticate, async (req, res) => {
    try {
        const id = req.params.id as string;
        const available = await publicClient.readContract({
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'isAvailable',
            args: [BigInt(id)]
        });
        res.json({ available });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /service/agency/:agencyId
 * @description Get all service IDs belonging to an agency
 */
router.get('/agency/:agencyId', authenticate, async (req, res) => {
    try {
        const agencyId = req.params.agencyId as string;
        const serviceIds = await publicClient.readContract({
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'getAgencyServices',
            args: [BigInt(agencyId)]
        });
        res.json({ serviceIds });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ── Write Routes ─────────────────────────────────────────────────────────────

/**
 * @route POST /service/create
 * @body { name, route, tokenPrice, maxSupply, metadataURI, agency_private_key }
 * @description Create a new ticket-type service (Active agency operator only)
 *              tokenPrice: human-readable (e.g. "100") — converted to 18 decimals internally
 *              maxSupply: 0 = unlimited
 *              agency_private_key: private key of the registered agency operator wallet
 */
router.post('/create', authenticate, authorize([Role.AGENCY, Role.ADMIN]), async (req: AuthRequest, res) => {
    try {
        const { name, route, tokenPrice, maxSupply, metadataURI, agency_private_key } = req.body;

        if (!agency_private_key) {
            res.status(400).json({ error: 'agency_private_key is required for contract execution' });
            return;
        }

        // Derive the agency account from the provided private key
        const agencyAccount = privateKeyToAccount(agency_private_key as Hex);

        // Security check: Private key address must match the authenticated address
        if (agencyAccount.address.toLowerCase() !== req.user?.address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: Private key does not match authenticated address' });
            return;
        }

        // Create a wallet client scoped to the agency operator
        const agencyWalletClient = createWalletClient({
            account: agencyAccount,
            chain,
            transport: http(process.env.SEPOLIA_RPC_URL)
        });

        const { request } = await publicClient.simulateContract({
            account: agencyAccount,
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'createService',
            args: [
                name,
                route,
                parseUnits(tokenPrice.toString(), 18),
                BigInt(maxSupply ?? 0),
                metadataURI
            ]
        });

        const hash = await agencyWalletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash, receipt });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /service/:id/status
 * @body { status }
 * @description Activate or deactivate a service (agency operator or platform owner)
 *              status: 0 = INACTIVE, 1 = ACTIVE
 */
router.put('/:id/status', authenticate, authorize([Role.AGENCY, Role.ADMIN]), async (req: AuthRequest, res) => {
    try {
        const { status } = req.body;
        const id = req.params.id as string;

        // Note: For simplicity in this demo, the platform admin account performs these admin-level writes.
        // In a real system, the agency would provide their key or we'd use a more complex authority system.

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'setServiceStatus',
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
 * @route PUT /service/:id/price
 * @body { newPrice }
 * @description Update the token price of a service (agency operator only)
 *              newPrice: human-readable (e.g. "150") — converted to 18 decimals internally
 */
router.put('/:id/price', authenticate, authorize([Role.AGENCY, Role.ADMIN]), async (req, res) => {
    try {
        const { newPrice, agency_private_key } = req.body;
        const id = req.params.id as string;

        if (!agency_private_key) {
            res.status(400).json({ error: 'agency_private_key is required for contract execution' });
            return;
        }
        
        const agencyAccount = privateKeyToAccount(agency_private_key as Hex);
        const agencyWalletClient = createWalletClient({
            account: agencyAccount,
            chain,
            transport: http(process.env.SEPOLIA_RPC_URL)
        });

        const { request } = await publicClient.simulateContract({
            account: agencyAccount,
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'updatePrice',
            args: [BigInt(id), parseUnits(newPrice.toString(), 18)]
        });

        const hash = await agencyWalletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /service/:id/supply
 * @body { newMaxSupply }
 * @description Update the max supply cap of a service (agency operator only)
 *              newMaxSupply: 0 = unlimited
 */
router.put('/:id/supply', authenticate, authorize([Role.AGENCY, Role.ADMIN]), async (req, res) => {
    try {
        const { newMaxSupply, agency_private_key } = req.body;
        const id = req.params.id as string;

        if (!agency_private_key) {
            res.status(400).json({ error: 'agency_private_key is required for contract execution' });
            return;
        }

        const agencyAccount = privateKeyToAccount(agency_private_key as Hex);
        const agencyWalletClient = createWalletClient({
            account: agencyAccount,
            chain,
            transport: http(process.env.SEPOLIA_RPC_URL)
        });

        const { request } = await publicClient.simulateContract({
            account: agencyAccount,
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'updateMaxSupply',
            args: [BigInt(id), BigInt(newMaxSupply ?? 0)]
        });

        const hash = await agencyWalletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /service/ticket-contract
 * @body { ticketContract }
 * @description Set the authorized ticket contract address (Owner only)
 */
router.put('/ticket-contract', authenticate, authorize([Role.ADMIN]), async (req, res) => {
    try {
        const { ticketContract } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: ServiceRegistryAbi,
            functionName: 'setTicketContract',
            args: [ticketContract]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

