// ─── FormController ───────────────────────────────────────────────────────────
// HTTP-only layer for form/application endpoints.
// Single Responsibility: translate HTTP request → service call → HTTP response.
// No business logic, no Prisma imports. Depends on IFormService and IPdfService.

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { IFormService } from '../services/IFormService';
import { IPdfService } from '../services/IPdfService';

export class FormController {
    // Dependency Injection: receives service interfaces, not concrete classes
    constructor(
        private readonly formService: IFormService,
        private readonly pdfService: IPdfService
    ) { }

    // ── Form Types ─────────────────────────────────────────────────────────

    getFormTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const roles = req.user?.roles || [];
            const types = await this.formService.getFormTypes(roles);
            res.json(types);
        } catch (e: any) {
            console.error('[FormController] getFormTypes:', e.message);
            res.status(500).json({ error: 'Failed to fetch form types' });
        }
    };

    createFormType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const { name, description, schema_definition, workflow_name, workflow_steps } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Form type name is required' });
            return;
        }

        try {
            const result = await this.formService.createFormType({
                name, description, schema_definition, workflow_name, workflow_steps
            });
            res.status(201).json(result);
        } catch (e: any) {
            console.error('[FormController] createFormType:', e.message);
            if (e.code === 'P2002') res.status(409).json({ error: 'A form type with this name already exists' });
            else res.status(500).json({ error: 'Failed to create form type' });
        }
    };

    updateFormType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        const { name, description, schema_definition, workflow_steps, is_active } = req.body;

        if (!name) { res.status(400).json({ error: 'Form type name is required' }); return; }
        if (isNaN(id)) { res.status(400).json({ error: 'Invalid form type id' }); return; }

        try {
            const result = await this.formService.updateFormType(id, {
                name, description, schema_definition, workflow_steps, is_active
            });
            res.json(result);
        } catch (e: any) {
            console.error('[FormController] updateFormType:', e.message);
            if (e.message === 'FORM_TYPE_NOT_FOUND') res.status(404).json({ error: 'Form type not found' });
            else if (e.code === 'P2002') res.status(409).json({ error: 'A form type with this name already exists' });
            else res.status(500).json({ error: 'Failed to update form type' });
        }
    };

    deleteFormType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        const roles = req.user?.roles || [];

        try {
            await this.formService.deleteFormType(id, roles);
            res.json({ message: 'Form type deleted successfully' });
        } catch (e: any) {
            console.error('[FormController] deleteFormType:', e.message);
            if (e.message === 'UNAUTHORIZED') res.status(403).json({ error: 'Only admins can delete form types' });
            else res.status(500).json({ error: 'Failed to delete form type.' });
        }
    };

    // ── Forms ──────────────────────────────────────────────────────────────

    getForms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        try {
            const forms = await this.formService.getForms(userId, req.user?.roles || []);
            res.json(forms);
        } catch (e: any) {
            console.error('[FormController] getForms:', e.message);
            res.status(500).json({ error: 'Failed to fetch forms' });
        }
    };

    getFormById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        try {
            const form = await this.formService.getFormById(id);
            res.json(form);
        } catch (e: any) {
            console.error('[FormController] getFormById:', e.message);
            if (e.message === 'FORM_NOT_FOUND') res.status(404).json({ error: 'Form not found' });
            else res.status(500).json({ error: 'Failed to get form' });
        }
    };

    createForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const { form_type_id, form_data } = req.body;
        if (!form_type_id) { res.status(400).json({ error: 'form_type_id is required' }); return; }

        try {
            const form = await this.formService.createForm({
                form_type_id: Number(form_type_id),
                form_data: form_data || {},
                userId,
            });
            res.status(201).json(form);
        } catch (e: any) {
            console.error('[FormController] createForm:', e.message);
            if (e.message === 'FORM_TYPE_NOT_FOUND') res.status(404).json({ error: 'Form type not found' });
            else res.status(500).json({ error: 'Failed to create form' });
        }
    };

    updateFormStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const formId = Number(req.params.id);
        const { decision, remarks, approvalData } = req.body;
        const userId = req.user?.userId;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
            res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
            return;
        }

        try {
            const form = await this.formService.updateFormStatus({
                formId, decision, remarks, approvalData, userId
            });
            res.json(form);
        } catch (e: any) {
            console.error('[FormController] updateFormStatus:', e.message);
            if (e.message === 'FORM_NOT_FOUND') res.status(404).json({ error: 'Form not found' });
            else if (e.message === 'NO_PENDING_APPROVAL') res.status(400).json({ error: 'No pending approval stage found for this form.' });
            else res.status(500).json({ error: e.message || 'Failed to update status' });
        }
    };

    deleteForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        const roles = req.user?.roles || [];

        try {
            await this.formService.deleteForm(id, roles);
            res.json({ message: 'Form deleted successfully' });
        } catch (e: any) {
            console.error('[FormController] deleteForm:', e.message);
            if (e.message === 'UNAUTHORIZED') res.status(403).json({ error: 'Only admins can delete forms' });
            else res.status(500).json({ error: 'Failed to delete form' });
        }
    }

    // ── PDF Download ───────────────────────────────────────────────────────

    downloadPdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);

        try {
            const pdfBuffer = await this.pdfService.generateFormPdf(id);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Application_${id}.pdf"`);
            res.send(pdfBuffer);
        } catch (e: any) {
            console.error('[FormController] downloadPdf:', e.message);
            if (e.message === 'FORM_NOT_FOUND') res.status(404).json({ error: 'Form not found' });
            else if (e.message === 'PDF_TEMPLATE_NOT_FOUND') res.status(500).json({ error: 'PDF template not found on server' });
            else res.status(500).json({ error: 'Failed to generate PDF' });
        }
    };
}
