import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { publicClient, contractAddresses, account as adminAccount } from '../clients.js';
import { AgencyRegistryAbi } from '../abi.js';
import { Address } from 'viem';

export enum Role {
    USER = 'user',
    AGENCY = 'agency',
    ADMIN = 'admin'
}

export interface AuthRequest extends Request {
    user?: {
        address: Address;
        role: Role;
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { address: Address };
        const address = decoded.address;

        // Determine Role
        let role = Role.USER;

        if (address.toLowerCase() === adminAccount.address.toLowerCase()) {
            role = Role.ADMIN;
        } else {
            const isActiveAgency = await publicClient.readContract({
                address: contractAddresses.agencyRegistry,
                abi: AgencyRegistryAbi,
                functionName: 'isActiveAgency',
                args: [address]
            });

            if (isActiveAgency) {
                role = Role.AGENCY;
            }
        }

        req.user = { address, role };
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

export const authorize = (roles: Role[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
