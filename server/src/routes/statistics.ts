// ─── routes/statistics.ts ─────────────────────────────────────────────────────
// Composition root for statistics routes. Admin-only.

import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { StatisticsController } from '../controllers/StatisticsController';
import { StatisticsService } from '../services/StatisticsService';
import prismaClient from '../prisma';

const router = express.Router();

const statsService = new StatisticsService(prismaClient);
const controller = new StatisticsController(statsService);

router.use(verifyToken);

router.get('/general/hourly', controller.getHourlyBreakdown);
router.get('/general', controller.getGeneralStats);
router.get('/user/:userId', controller.getUserStats);
router.get('/ip', controller.getIpStats);
router.get('/users', controller.getAllUsers);

export default router;
