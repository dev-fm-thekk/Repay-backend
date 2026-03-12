import { Router, Request, Response } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import jwt from 'jsonwebtoken';
import { Address } from 'viem';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// In-memory nonce storage (for demo purposes, use Redis/Session in production)
const nonces = new Set<string>();

/**
 * @route GET /auth/nonce
 * @description Get a unique nonce for SIWE login
 */
router.get('/nonce', (req, res) => {
    const nonce = generateNonce();
    nonces.add(nonce);
    
    // Clear nonce after 5 minutes
    setTimeout(() => nonces.delete(nonce), 5 * 60 * 1000);
    
    res.json({ nonce });
});

/**
 * @route POST /auth/login
 * @description Verify SIWE signature and issue a JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { message, signature } = req.body;
        const siweMessage = new SiweMessage(message);
        
        // Verify nonce
        if (!nonces.has(siweMessage.nonce)) {
            res.status(400).json({ error: 'Invalid or expired nonce' });
            return;
        }

        const { data, success, error } = await siweMessage.verify({ signature });

        if (!success) {
            res.status(400).json({ error: error?.toString() || 'Signature verification failed' });
            return;
        }

        // Remove nonce once used
        nonces.delete(siweMessage.nonce);

        const address = data.address as Address;
        
        // Generate JWT
        const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ 
            success: true, 
            token, 
            address,
            message: 'Logged in successfully'
        });

    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
