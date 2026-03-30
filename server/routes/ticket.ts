import { Router } from 'express';
import { Address, formatUnits, createWalletClient, http, Hex, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { publicClient, walletClient, account, chain, contractAddresses } from '../clients.js';
import { TicketNFTAbi, RewardTokenAbi, ServiceRegistryAbi } from '../abi.js';

import { authenticate, authorize, Role, AuthRequest } from '../middlewares/auth.js';

const router = Router();
const contractAddress = contractAddresses.ticketNFT;

// ── Read Routes ──────────────────────────────────────────────────────────────

/**
 * @route GET /ticket/:tokenId
 * @description Get full metadata for a ticket by token ID
 */
router.get('/:tokenId', authenticate, async (req, res) => {
    try {
        const tokenId = req.params.tokenId as string;
        const ticket = await publicClient.readContract({
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'getTicket',
            args: [BigInt(tokenId)]
        });
        res.json(ticket);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /ticket/:tokenId/status
 * @description Get the current status of a ticket (0=VALID, 1=USED, 2=EXPIRED)
 */
router.get('/:tokenId/status', authenticate, async (req, res) => {
    try {
        const tokenId = req.params.tokenId as string;
        const status = await publicClient.readContract({
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'getTicketStatus',
            args: [BigInt(tokenId)]
        });
        const statusLabels = ['VALID', 'USED', 'EXPIRED'];
        res.json({ status, label: statusLabels[Number(status)] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /ticket/:tokenId/valid
 * @description Check if a ticket is currently valid (not used, not expired)
 */
router.get('/:tokenId/valid', authenticate, async (req, res) => {
    try {
        const tokenId = req.params.tokenId as string;
        const isValid = await publicClient.readContract({
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'isTicketValid',
            args: [BigInt(tokenId)]
        });
        res.json({ isValid });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /ticket/holder/:address
 * @description Get all ticket token IDs owned by a holder address
 */
router.get('/holder/:address', authenticate, async (req: AuthRequest, res) => {
    try {
        const targetAddress = req.params.address as string;
        // Only allow users to see their own tickets, or admins to see anyone's
        if (req.user?.role !== Role.ADMIN && req.user?.address.toLowerCase() !== targetAddress.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: You can only view your own tickets' });
            return;
        }

        const tokenIds = await publicClient.readContract({
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'getHolderTickets',
            args: [targetAddress as Address]
        });
        res.json({ tokenIds });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /ticket/validity-period
 * @description Get the default validity period for newly minted tickets (in seconds)
 */
router.get('/validity-period', authenticate, async (req, res) => {
    try {
        const period = await publicClient.readContract({
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'defaultValidityPeriod'
        });
        res.json({ validityPeriodSeconds: period });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ── Write Routes ─────────────────────────────────────────────────────────────

/**
 * @route POST /ticket/purchase
 * @body { serviceId, metadataURI, private_key }
 * @description Purchase a ticket for a government service using RWDR tokens.
 *              Caller must have approved the TicketNFT contract to spend tokenPrice RWDR beforehand.
 *              private_key: private key of the buyer's wallet (must match logged in user)
 */
router.post('/purchase', authenticate, async (req: AuthRequest, res) => {
    try {
        const { serviceId, metadataURI = "ipfs://default-ticket", private_key } = req.body;
        if (!private_key) {
            res.status(400).json({ error: 'private_key is required' });
            return;
        }

        // Derive the buyer's account from the provided private key
        const buyerAccount = privateKeyToAccount(private_key as Hex);
        
        // Security check: Private key address must match the authenticated address
        if (buyerAccount.address.toLowerCase() !== req.user?.address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: Private key does not match authenticated address' });
            return;
        }

        // Create a wallet client scoped to the buyer
        const buyerWalletClient = createWalletClient({
            account: buyerAccount,
            chain,
            transport: http(process.env.SEPOLIA_RPC_URL)
        });

        // ── 1. Fetch token price & check balance ──
        const tokenPrice = await publicClient.readContract({
            address: contractAddresses.serviceRegistry,
            abi: ServiceRegistryAbi,
            functionName: 'getPrice',
            args: [BigInt(serviceId)]
        });

        const balance = await publicClient.readContract({
            address: contractAddresses.rewardToken,
            abi: RewardTokenAbi,
            functionName: 'balanceOf',
            args: [buyerAccount.address]
        });

        if (balance < tokenPrice) {
            res.status(400).json({ 
                error: `Insufficient RWDR balance. Required: ${formatUnits(tokenPrice, 18)}, Available: ${formatUnits(balance, 18)}` 
            });
            return;
        }

        // ── 2. Check & Auto-Approve allowance if needed ──
        const currentAllowance = await publicClient.readContract({
            address: contractAddresses.rewardToken,
            abi: RewardTokenAbi,
            functionName: 'allowance',
            args: [buyerAccount.address, contractAddress]
        });

        if (currentAllowance < tokenPrice) {
            const { request: approveRequest } = await publicClient.simulateContract({
                account: buyerAccount,
                address: contractAddresses.rewardToken,
                abi: RewardTokenAbi,
                functionName: 'approve',
                args: [contractAddress, tokenPrice]
            });
            const approveHash = await buyerWalletClient.writeContract(approveRequest);
            await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }

        // ── 3. Proceed with Purchase ──
        const { request } = await publicClient.simulateContract({
            account: buyerAccount,
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'purchaseTicket',
            args: [BigInt(serviceId), metadataURI]
        });

        const hash = await buyerWalletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Extract tokenId from logs
        let tokenId: bigint | undefined;
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: TicketNFTAbi,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === 'TicketPurchased') {
                    tokenId = (decoded.args as any).tokenId;
                    break;
                }
            } catch (err: any) {
                // Not the event we're looking for, skip
            }
        }



        res.json({ 
            success: true, 
            transactionHash: hash, 
            tokenId: tokenId?.toString(),
            receipt 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /ticket/:tokenId/validate
 * @description Validate (scan) a ticket at the gate (Active agency operator only)
 *              Marks the ticket as USED so it cannot be reused.
 */
router.post('/:tokenId/validate', authenticate, authorize([Role.AGENCY, Role.ADMIN]), async (req: AuthRequest, res) => {
    try {
        // For validation, we use the wallet client of the logged-in agency/admin
        // Note: In a real system, the agency operator would provide their PK here or it would be stored securely.
        // For this demo, we assume the admin's wallet can technically validate ifauthorized, 
        // but the contract requirement might need the actual agency's PK.
        // Since we don't have the agency's PK from the JWT alone, we'll still need it in the body for now,
        // but we'll verify it matches the authenticated user.
        
        const { operator_private_key } = req.body;

        if (!operator_private_key) {
            res.status(400).json({ error: 'operator_private_key is required for contract execution' });
            return;
        }

        const operatorAccount = privateKeyToAccount(operator_private_key as Hex);
        if (operatorAccount.address.toLowerCase() !== req.user?.address.toLowerCase()) {
            res.status(403).json({ error: 'Forbidden: Private key does not match authenticated address' });
            return;
        }

        const tokenId = req.params.tokenId as string;
        const { request } = await publicClient.simulateContract({
            account: operatorAccount,
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'validateTicket',
            args: [BigInt(tokenId)]
        });

        const operatorWalletClient = createWalletClient({
            account: operatorAccount,
            chain,
            transport: http(process.env.SEPOLIA_RPC_URL)
        });

        const hash = await operatorWalletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash, receipt });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /ticket/:tokenId/expire
 * @description Trigger expiry check for a ticket — anyone can call this.
 *              Only changes state if the ticket is past its validity window.
 */
router.post('/:tokenId/expire', async (req, res) => {
    try {
        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'expireTicket',
            args: [BigInt(req.params.tokenId)]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route PUT /ticket/validity-period
 * @body { periodSeconds }
 * @description Update the default validity window for newly minted tickets (Owner only)
 *              Set to 0 for no expiry.
 */
router.put('/validity-period', async (req, res) => {
    try {
        const { periodSeconds } = req.body;

        const { request } = await publicClient.simulateContract({
            account,
            address: contractAddress,
            abi: TicketNFTAbi,
            functionName: 'setDefaultValidityPeriod',
            args: [BigInt(periodSeconds)]
        });

        const hash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash });

        res.json({ success: true, transactionHash: hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
