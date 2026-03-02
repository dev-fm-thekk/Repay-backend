import express from 'express';
import { contractService } from '../services/contractService.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { requireAdmin, requireBin } from '../middlewares/rbac.js';
import { keccak256, stringToBytes } from 'viem'; // Added keccak256 and stringToBytes

const router = express.Router();

// Register Smart Bin (Admin)
router.post(['/', '/bins'], authenticate, requireAdmin, async (req, res) => {
    try {
        const { binAddress, location, operator } = req.body;
        if (!binAddress || !location || !operator) {
            return res.status(400).json({ error: 'binAddress, location, and operator are required' });
        }

        const txHash = await contractService.registerBinTransaction(binAddress, location, operator);
        res.json({ 
            message: 'Bin registration transaction submitted', 
            transactionHash: txHash 
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to register bin', details: error.message });
    }
});

// Get Bin Status
router.get(['/:address', '/bins/:address'], async (req, res) => {
  try {
    const address = req.params.address;
    const bin = await contractService.getBin(address as string);

    res.json({
      binAddress: bin[0],
      location: bin[1],
      operator: bin[2],
      isActive: bin[3],
      totalWeightProcessed: Number(bin[4]),
      totalTokensDispensed: Number(bin[5]),
    });
  } catch (error) {
    res.status(404).json({ error: 'Bin not found' });
  }
});

// Process Drop (Bin/Oracle)
router.post(['/:address/drop', '/bins/:address/drop'], authenticate, requireBin, async (req: AuthRequest, res) => {
  try {
    const targetAddress = req.params.address;
    // Restriction: Bins using API keys are restricted to calling processDrop for their own address
    if (req.user?.type === 'bin' && req.user.address.toLowerCase() !== (targetAddress as string).toLowerCase()) {
        return res.status(403).json({ error: 'Bins can only report drops for themselves.' });
    }

    const { productId, userWallet, weight, classification, confidenceScore, proofHash } = req.body;
    
    if (!productId || !userWallet || !weight || !classification) {
        return res.status(400).json({ error: 'Missing required drop data (productId, userWallet, weight, classification)' });
    }

    const txHash = await contractService.processDropTransaction(
        BigInt(productId),
        userWallet,
        BigInt(weight),
        classification,
        BigInt(confidenceScore || 100),
        proofHash || keccak256(stringToBytes(`${productId}-${userWallet}-${Date.now()}`)) // Generate dummy hash if none provided
    );

    res.json({
        status: 'success',
        message: `Drop processed for product ${productId} at bin ${targetAddress}`,
        transactionHash: txHash
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process drop', details: error.message });
  }
});

// ECO Token Balance
router.get(['/eco/balance/:address', '/balance/:address'], async (req, res) => {
  try {
    const balance = await contractService.getEcoBalance(req.params.address as string);
    res.json({
      address: req.params.address,
      balance: balance.toString(),
      formatted: Number(balance) / 1e18
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Reward Rates
router.get(['/eco/rates/:material', '/rates/:material'], async (req, res) => {
    try {
        const rate = await contractService.getRewardRate(req.params.material as string);
        res.json({
            material: req.params.material,
            ratePerGram: rate.toString()
        });
    } catch (error) {
        res.status(404).json({ error: 'Material not found or rate not set' });
    }
});

// Calculate Expected Reward
router.get(['/eco/calculate', '/calculate'], async (req, res) => {
  const { weight, material, confidence } = req.query;
  if (!weight || !material || !confidence) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const reward = await contractService.calculateExpectedReward(
      BigInt(weight as string),
      material as string,
      BigInt(confidence as string)
    );
    res.json({
      expectedReward: reward.toString(),
      formatted: Number(reward) / 1e18
    });
  } catch (error) {
    res.status(500).json({ error: 'Calculation failed' });
  }
});


export default router;
