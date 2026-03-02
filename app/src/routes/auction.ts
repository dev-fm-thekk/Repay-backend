import express from 'express';
import { contractService } from '../services/contractService.js';
import { authenticate } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/rbac.js';
import logger from '../utils/logger.js';

const router = express.Router();

// List Auctions
router.get('/', async (req, res) => {
  try {
    const count = await contractService.getAuctionCount();
    const auctions = [];
    const statusFilter = req.query.status;
    for (let i = 1n; i <= count; i++) {
        const auction = await contractService.getAuction(i);
        const auctionStatus = Number(auction[6]);

        // Support filtering by status if provided (e.g. status=OPEN)
        if (statusFilter === 'OPEN' && auctionStatus !== 0) continue;

        auctions.push({
            id: auction[0].toString(),
            binAddress: auction[1],
            materialType: auction[2],
            estimatedWeight: auction[3].toString(),
            minBidETH: auction[4].toString(),
            endTime: Number(auction[5]),
            status: auctionStatus,
            highestBidder: auction[7],
            highestBid: auction[8].toString(),
            finalized: auctionStatus >= 1,
            collected: auctionStatus === 2
        });
    }
    res.json(auctions);
  } catch (error) {
    logger.error(`Failed to fetch auctions: ${error}`);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Register Recycler (Admin)
router.post('/recyclers', authenticate, requireAdmin, async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ error: 'Recycler address is required' });

        const txHash = await contractService.registerRecyclerTransaction(address);
        res.json({ 
            message: 'Recycler registration transaction submitted', 
            transactionHash: txHash 
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to register recycler', details: error.message });
    }
});

// Get Recycler Status
router.get('/recyclers/:address', async (req, res) => {
    const isVerified = await contractService.isVerifiedRecycler(req.params.address as string);
    res.json({ address: req.params.address, isVerified });
});

export default router;
