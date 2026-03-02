import express from 'express';
import { contractService } from '../services/contractService.js';
import { authenticate } from '../middlewares/auth.js';
import { Address } from 'viem';
import { env } from '../config/env.js';

const router = express.Router();

// List Active Listings
router.get('/listings', async (req, res) => {
  try {
    const count = await (contractService as any).client.readContract({
        address: env.CONTRACTS.MARKETPLACE as Address,
        abi: [
            {"inputs": [], "name": "listingCounter", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
        ],
        functionName: 'listingCounter'
    });

    const listings = [];
    for (let i = 1n; i <= count; i++) {
        const listing = await (contractService as any).client.readContract({
            address: env.CONTRACTS.MARKETPLACE as Address,
            abi: [
                {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "listings", "outputs": [{"internalType": "address", "name": "seller", "type": "address"}, {"internalType": "uint256", "name": "ecoTokenAmount", "type": "uint256"}, {"internalType": "uint256", "name": "askPriceETH", "type": "uint256"}, {"internalType": "bool", "name": "active", "type": "bool"}], "stateMutability": "view", "type": "function"}
            ],
            functionName: 'listings',
            args: [i]
        });
        if (listing[3]) { // active
            listings.push({
                id: i.toString(),
                seller: listing[0],
                amount: listing[1].toString(),
                price: listing[2].toString(),
                active: listing[3]
            });
        }
    }
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Create Listing (Prepares data)
router.post('/listings', authenticate, async (req, res) => {
  res.status(501).json({ message: 'Listings must be created on-chain by the user.' });
});

// List Available Services
router.get('/services', (req, res) => {
  res.json([
    { id: 'BUS_PASS_MONTHLY', name: 'Monthly Bus Pass', costECO: '800000000000000000000' },
    { id: 'METRO_PASS_WEEKLY', name: 'Weekly Metro Pass', costECO: '250000000000000000000' },
    { id: 'PARKING_VOUCHER', name: '24h Parking Voucher', costECO: '50000000000000000000' }
  ]);
});

export default router;
