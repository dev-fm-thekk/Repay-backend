import express from 'express';
import { contractService } from '../services/contractService.js';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { requireAdmin } from '../middlewares/rbac.js';

const router = express.Router();

// Get Company Info
router.get('/companies/:address', async (req, res) => {
  try {
    const address = req.params.address;
    const company = await contractService.getCompany(address);
    res.json({
      wallet: company[0],
      name: company[1],
      isVerified: company[2],
      registeredAt: Number(company[3]),
    });
  } catch (error) {
    res.status(404).json({ error: 'Company not found' });
  }
});

// Register Company
router.post('/companies', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });

    const txHash = await contractService.registerCompanyTransaction(name, req.user?.address!);
    res.json({ 
      message: 'Company registration transaction submitted', 
      transactionHash: txHash 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register company', details: error.message });
  }
});

// Verify Company (Admin)
router.patch('/companies/:address/verify', authenticate, requireAdmin, async (req, res) => {
  try {
    const address = req.params.address as string;
    const txHash = await contractService.verifyCompanyTransaction(address);
    res.json({ 
      message: 'Company verification transaction submitted', 
      transactionHash: txHash 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to verify company', details: error.message });
  }
});

// Register Product
router.post('/products', authenticate, async (req: AuthRequest, res) => {
  try {
    const isVerified = await contractService.isVerifiedCompany(req.user?.address!);
    const isAdmin = await contractService.isAdmin(req.user?.address!);

    if (!isVerified && !isAdmin) {
      return res.status(403).json({ error: 'Only verified companies or admins can register products' });
    }

    const { name, category, metadataURI } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Name and category are required' });

    const txHash = await contractService.registerProductTransaction(req.user?.address!, name, category, metadataURI || '');
    res.json({ 
      message: 'Product registration transaction submitted', 
      transactionHash: txHash 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register product', details: error.message });
  }
});

// Get Product Details
router.get('/products/:id', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const [product, company, recycleRecord, hasRecycleRecord] = await contractService.getProduct(id);
    
    res.json({
      product: {
        productId: Number(product.productId),
        companyWallet: product.companyWallet,
        name: product.name,
        category: product.category,
        metadataURI: product.metadataURI,
        isRecycled: product.isRecycled,
        createdAt: Number(product.createdAt),
      },
      company: {
        wallet: company.wallet,
        name: company.name,
        isVerified: company.isVerified,
      },
      recycleRecord: hasRecycleRecord ? {
        binAddress: recycleRecord.binAddress,
        weight: Number(recycleRecord.weight),
        classification: recycleRecord.classification,
        timestamp: Number(recycleRecord.timestamp),
      } : null
    });
  } catch (error) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Register Bin (Admin)
router.post('/bins', authenticate, requireAdmin, async (req, res) => {
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

export default router;
