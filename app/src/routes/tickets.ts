import express from 'express';
import { contractService, TICKET_NFT_ABI } from '../services/contractService.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { Address } from 'viem';
import { env } from '../config/env.js';

const router = express.Router();

// Get User Tickets
router.get('/user/:address', async (req, res) => {
  try {
    // This requires iterating or a specialized contract method
    // For now we return a generic message or try to fetch the first few
    const userTickets = await (contractService as any).client.readContract({
        address: env.CONTRACTS.TICKETS as Address,
        abi: TICKET_NFT_ABI,
        functionName: 'getUserTickets',
        args: [req.params.address as Address]
    });

    const tickets = [];
    for (const tokenId of userTickets) {
        const ticket = await (contractService as any).client.readContract({
            address: env.CONTRACTS.TICKETS as Address,
            abi: TICKET_NFT_ABI,
            functionName: 'tickets',
            args: [tokenId]
        });

        tickets.push({
            id: tokenId.toString(),
            routeId: ticket[2],
            purchaseTime: Number(ticket[11]),
            expiryTime: Number(ticket[7]),
            isPremium: ticket[4] === 1,
            isUsed: ticket[8]
        });
    }

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user tickets' });
  }
});

// Configure Route (Admin)
router.post('/routes', authenticate, async (req, res) => {
    try {
        // Check if admin (contract requires admin for configureRoute based on Solidity code)
        const isAdmin = await contractService.isAdmin((req as any).user.address);
        if (!isAdmin) return res.status(403).json({ error: 'Only Admin can configure routes' });

        const { routeId, mode, zone, standardCost, premiumCost, validity } = req.body;
        
        if (!routeId || mode === undefined || !zone || !standardCost || !premiumCost || !validity) {
            return res.status(400).json({ error: 'All route parameters are required' });
        }

        const txHash = await contractService.configureRouteTransaction(
            routeId,
            Number(mode),
            zone,
            BigInt(standardCost),
            BigInt(premiumCost),
            BigInt(validity)
        );

        res.json({ 
            message: 'Route configuration transaction submitted', 
            transactionHash: txHash 
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to configure route', details: error.message });
    }
});

export default router;
