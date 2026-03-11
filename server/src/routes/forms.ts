// ─── routes/forms.ts ──────────────────────────────────────────────────────────
// Composition root for form/application routes.
// Sole responsibility: wire up dependencies and register route handlers.
// No business logic here — all logic lives in FormService / WorkflowService / PdfService.

import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { FormController } from '../controllers/FormController';
import { FormService } from '../services/FormService';
import { WorkflowService } from '../services/WorkflowService';
import { PdfService } from '../services/PdfService';
import { FormRepository } from '../repositories/FormRepository';
import prismaClient from '../prisma';

const router = express.Router();

// ─── Dependency Injection (manual composition root) ────────────────────────
const formRepo = new FormRepository(prismaClient);
const workflowService = new WorkflowService(prismaClient);
const pdfService = new PdfService(prismaClient);
const formService = new FormService(formRepo, workflowService);
const controller = new FormController(formService, pdfService);

// ─── Form Type Routes ──────────────────────────────────────────────────────
router.get('/types', controller.getFormTypes);
router.post('/types', verifyToken, controller.createFormType);
router.put('/types/:id', verifyToken, controller.updateFormType);
router.delete('/types/:id', verifyToken, controller.deleteFormType);

// ─── Form / Application Routes ─────────────────────────────────────────────
router.get('/', verifyToken, controller.getForms);
router.post('/', verifyToken, controller.createForm);
router.get('/:id', verifyToken, controller.getFormById);
router.patch('/:id/status', verifyToken, controller.updateFormStatus);
router.delete('/:id', verifyToken, controller.deleteForm);
router.get('/:id/download', verifyToken, controller.downloadPdf);

export default router;
