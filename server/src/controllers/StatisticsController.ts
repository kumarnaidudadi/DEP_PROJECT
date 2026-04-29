// ─── StatisticsController ─────────────────────────────────────────────────────
// HTTP layer for statistics endpoints. Admin-only.

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { StatisticsService } from '../services/StatisticsService';

export class StatisticsController {
    constructor(private readonly statsService: StatisticsService) {}

    // GET /api/statistics/general
    getGeneralStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roles = req.user?.roles || [];
        if (!roles.includes('ADMIN')) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        try {
            const { dateFrom, dateTo, singleDate, timeFrom, timeTo } = req.query as Record<string, string>;
            const data = await this.statsService.getGeneralStats({
                dateFrom, dateTo, singleDate, timeFrom, timeTo,
            });
            res.json(data);
        } catch (e: any) {
            console.error('[StatisticsController] getGeneralStats:', e.message);
            res.status(500).json({ error: 'Failed to compute general statistics' });
        }
    };

    // GET /api/statistics/user/:userId
    getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roles = req.user?.roles || [];
        if (!roles.includes('ADMIN')) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        try {
            const userId = Number(req.params.userId);
            if (isNaN(userId)) { res.status(400).json({ error: 'Invalid user id' }); return; }
            const { dateFrom, dateTo, singleDate, timeFrom, timeTo } = req.query as Record<string, string>;
            const data = await this.statsService.getUserStats({
                userId, dateFrom, dateTo, singleDate, timeFrom, timeTo,
            });
            res.json(data);
        } catch (e: any) {
            console.error('[StatisticsController] getUserStats:', e.message);
            if (e.message === 'USER_NOT_FOUND') res.status(404).json({ error: 'User not found' });
            else res.status(500).json({ error: 'Failed to compute user statistics' });
        }
    };

    // GET /api/statistics/ip
    getIpStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roles = req.user?.roles || [];
        if (!roles.includes('ADMIN')) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        try {
            const { ipAddress, dateFrom, dateTo, singleDate, timeFrom, timeTo } = req.query as Record<string, string>;
            if (!ipAddress) { res.status(400).json({ error: 'ipAddress query param is required' }); return; }
            const data = await this.statsService.getIpStats({
                ipAddress, dateFrom, dateTo, singleDate, timeFrom, timeTo,
            });
            res.json(data);
        } catch (e: any) {
            console.error('[StatisticsController] getIpStats:', e.message);
            res.status(500).json({ error: 'Failed to compute IP statistics' });
        }
    };

    // GET /api/statistics/users — for the user filter dropdown
    getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roles = req.user?.roles || [];
        if (!roles.includes('ADMIN')) {
            res.status(403).json({ error: 'Admin access required' });
            return;
        }
        try {
            const users = await this.statsService.getAllUsersForFilter();
            res.json(users);
        } catch (e: any) {
            console.error('[StatisticsController] getAllUsers:', e.message);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    };
}
