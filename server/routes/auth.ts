import { Router, Request, Response } from 'express';
import { SiweMessage, generateNonce } from 'siwe';
import jwt from 'jsonwebtoken';
import { Address } from 'viem';
import logger from '../utils/logger.js';

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
        let siweMessage: SiweMessage;
        try {
            // If message is a JSON string, parse it first
            const prospectiveMessage = typeof message === 'string' && message.trim().startsWith('{')
                ? JSON.parse(message)
                : message;

            siweMessage = new SiweMessage(prospectiveMessage);
        } catch (e: any) {
            let errorDetail = 'Invalid SIWE message format';
            if (typeof message === 'string') {
                if (message.includes('would like you to sign in')) {
                    errorDetail = 'SIWE message must use the exact phrase "wants you to sign in with your Ethereum account:" (EIP-4361)';
                } else if (!message.includes('\n') && message.length > 50) {
                    errorDetail = 'SIWE message is missing required newlines (EIP-4361)';
                } else if (message.length < 50) {
                    errorDetail = 'SIWE message is too short or incomplete';
                }
            }
            logger.error(`SIWE Message Construction Error: ${e.message}`, { message, error: e });
            res.status(400).json({ 
                error: errorDetail,
                message: 'Sign-in with Ethereum (SIWE) requires a specific message format (EIP-4361).',
                validExample: `localhost wants you to sign in with your Ethereum account:\n0xYourAddress\n\nSign in to access the RePay transport ecosystem.\n\nURI: http://localhost\nVersion: 1\nChain ID: 11155111\nNonce: [Get from /auth/nonce]\nIssued At: ${new Date().toISOString()}`,
                rawError: e.message 
            });
            return;
        }

        // Verify nonce
        if (!nonces.has(siweMessage.nonce)) {
            res.status(400).send({ error: 'Invalid or expired nonce' });
            return;
        }

        let verifyResult;
        try {
            verifyResult = await siweMessage.verify({ signature });
        } catch (verifyErr: any) {
            // SIWE might throw on verification failure in some versions/cases
            const errDetail = verifyErr.error || verifyErr;
            logger.error(`SIWE Verification Exception: ${errDetail.type || JSON.stringify(errDetail)}`, { verifyErr });
            res.status(400).json({ error: errDetail.type || 'Signature verification failed' });
            return;
        }

        const { data, success, error } = verifyResult;

        if (!success) {
            res.status(400).json({ error: error?.toString() || 'Signature verification failed' });
            return;
        }

        // Remove nonce once used
        nonces.delete(siweMessage.nonce);

        const address = data.address as Address;

        // Generate JWT
        const token = jwt.sign({ address }, JWT_SECRET, { expiresIn: '24h' });

        logger.info(`Successful login for address: ${address}`);

        res.json({
            success: true,
            token,
            address,
            message: 'Logged in successfully'
        });

    } catch (err: any) {
        const errorMsg = err.message || JSON.stringify(err);
        logger.error(`Login error: ${errorMsg}`, { stack: err.stack, fullError: err });
        res.status(500).send({ error: errorMsg, details: err });
    }
});

import { authenticate, AuthRequest } from '../middlewares/auth.js';

/**
 * @route GET /auth/me
 * @description Get current user info and role
 */
router.get('/me', authenticate, (req: AuthRequest, res) => {
    res.json({
        address: req.user?.address,
        role: req.user?.role
    });
});

export default router;
