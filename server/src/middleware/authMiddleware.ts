import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: number;
        email: string;
        roles: string[];
    };
}

/**
 * Middleware to verify JWT token from the Authorization header.
 * Attaches decoded user data to `req.user`.
 */
export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: number;
            email: string;
            roles: string[];
        };

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ─── RBAC Middleware ─────────────────────────────────────────────────
export function checkRole(allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userRoles = req.user?.roles || [];

        // Check if user has at least one of the allowed roles
        const hasRole = userRoles.some(role => allowedRoles.includes(role));

        if (!hasRole) {
            res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
            return;
        }

        next();
    };
}

// ─── Inactive User Guard ─────────────────────────────────────────────
export async function inactiveUserGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || !req.user.userId) {
        // Not authenticated yet, allow verifyToken to handle it or skip if public route
        return next();
    }

    try {
        const user = await prisma.users.findUnique({
            where: { id: req.user.userId },
            select: { is_active: true }
        });

        if (user && user.is_active === false) {
            // Send 403 with a special flag indicating inactive status
            res.status(403).json({ error: 'Account is inactive', inactive: true });
            return;
        }

        next();
    } catch (e: any) {
        console.error('[authMiddleware] inactiveUserGuard error:', e.message);
        res.status(500).json({ error: 'Internal server error verifying account status' });
    }
}

