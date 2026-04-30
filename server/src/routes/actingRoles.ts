import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { ActingRoleController } from '../controllers/ActingRoleController';

const router = express.Router();
const controller = new ActingRoleController();

router.get('/sent', verifyToken, controller.getSentRequests);
router.get('/received', verifyToken, controller.getReceivedRequests);
router.get('/active', verifyToken, controller.getActiveActingRoles);
router.post('/request', verifyToken, controller.createRequest);
router.post('/:id/cancel', verifyToken, controller.cancelRequest);
router.post('/:id/accept', verifyToken, controller.acceptRequest);
router.post('/:id/reject', verifyToken, controller.rejectRequest);
router.post('/:id/withdraw', verifyToken, controller.withdrawRequest);

export default router;
