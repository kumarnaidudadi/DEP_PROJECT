// ─── routes/user-admin.ts ────────────────────────────────────────────────────────
import express from 'express';
import multer from 'multer';
import { UserAdminController } from '../controllers/UserAdminController';
import { UserService } from '../services/UserService';
import { ExcelService } from '../services/ExcelService';
import { ReactivationService } from '../services/ReactivationService';
import { ActivityLogService } from '../services/ActivityLogService';
import prismaClient from '../prisma';
import { verifyToken, checkRole, inactiveUserGuard } from '../middleware/authMiddleware';
// Assuming you have an isAdmin middleware, using authenticate for now and controller needs to verify roles or add guard

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Services
const activityLogService = new ActivityLogService(prismaClient);
const userService = new UserService(prismaClient, activityLogService);
const excelService = new ExcelService();
const reactivationService = new ReactivationService(prismaClient, activityLogService);

// Controller
const controller = new UserAdminController(userService, excelService, reactivationService);

// Protected Routes
router.use(verifyToken);
router.use(inactiveUserGuard);

// ── ADD USER (Single) ──
router.post('/add', controller.addUser);

// ── BULK UPLOAD (Excel) ──
router.post('/bulk-upload', upload.single('file'), controller.bulkUpload);

// ── TEMPLATE DOWNLOAD ──
router.get('/excel-template', controller.downloadTemplate);

// ── INACTIVE USERS VIEW ──
router.get('/inactive', controller.getInactiveUsers);
router.get('/users', controller.getAllUsers);

// ── TOGGLE STATUS ──
router.put('/:id/status', controller.toggleUserStatus);

// ── REACTIVATION REQUESTS (ADMIN) ──
router.get('/reactivation-requests', controller.getPendingRequests);
router.put('/reactivation-requests/:id/process', controller.processReactivationRequest);

// ── SUBMIT REACTIVATION REQUEST (INACTIVE USER) ──
// This specific endpoint might be called by an inactive user, so maybe we need a looser check
// For now it assumes authenticate allows inactive users to still have a token
router.post('/reactivation-requests', controller.submitReactivationRequest);

export default router;
