import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { ActingRoleService } from '../services/ActingRoleService';
import prisma from '../prisma';

import { EmailService } from '../services/EmailService';

export class ActingRoleController {
    private service: ActingRoleService;

    constructor() {
        const emailService = new EmailService(prisma);
        this.service = new ActingRoleService(prisma, emailService);
    }

    getSentRequests = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.getSentRequests(userId);
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    };

    getReceivedRequests = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.getReceivedRequests(userId);
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    };

    getActiveActingRoles = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.getActiveActingRoles(userId);
            res.json(data);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    };

    createRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.createRequest(userId, req.body);
            res.json(data);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    cancelRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const requestId = parseInt(req.params.id as string);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.cancelRequest(userId, requestId);
            res.json(data);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    acceptRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const requestId = parseInt(req.params.id as string);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.respondRequest(userId, requestId, 'accepted');
            res.json(data);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    rejectRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const requestId = parseInt(req.params.id as string);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.respondRequest(userId, requestId, 'rejected');
            res.json(data);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };

    withdrawRequest = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user?.userId;
            const requestId = parseInt(req.params.id as string);
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const data = await this.service.withdrawRequest(userId, requestId);
            res.json(data);
        } catch (err: any) {
            res.status(400).json({ error: err.message });
        }
    };
}
