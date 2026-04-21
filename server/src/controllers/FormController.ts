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
        const { name, description, schema, approval_rules, ref_prefix } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Form type name is required' });
            return;
        }

        try {
            const result = await this.formService.createFormType({
                name, description, schema, approval_rules, ref_prefix
            });
            res.status(201).json(result);
        } catch (e: any) {
            console.error('[FormController] createFormType:', e.message);
            if (e.message === 'PREFIX_TAKEN') res.status(409).json({ error: 'A form with this prefix already exists. Please choose a different prefix.' });
            else if (e.code === 'P2002') res.status(409).json({ error: 'A form type with this name already exists' });
            else res.status(500).json({ error: 'Failed to create form type' });
        }
    };

    updateFormType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        const { name, description, schema, approval_rules, is_active, ref_prefix } = req.body;

        if (!name) { res.status(400).json({ error: 'Form type name is required' }); return; }
        if (isNaN(id)) { res.status(400).json({ error: 'Invalid form type id' }); return; }

        try {
            const result = await this.formService.updateFormType(id, {
                name, description, schema, approval_rules, is_active, ref_prefix
            });
            res.json(result);
        } catch (e: any) {
            console.error('[FormController] updateFormType:', e.message);
            if (e.message === 'FORM_TYPE_NOT_FOUND') res.status(404).json({ error: 'Form type not found' });
            else if (e.message === 'PREFIX_TAKEN') res.status(409).json({ error: 'A form with this prefix already exists. Please choose a different prefix.' });
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

        const form_type_id = req.body.form_type_id || req.params.type_id;
        const { form_data, id, toUserId, note } = req.body;
        if (!form_type_id) { res.status(400).json({ error: 'form_type_id is required' }); return; }

        try {
            const form = await this.formService.createForm({
                form_type_id: Number(form_type_id),
                form_data: form_data || {},
                userId,
                toUserId: toUserId ? Number(toUserId) : undefined,
                note: note || '',
            }, id ? Number(id) : undefined);
            res.status(201).json(form);
        } catch (e: any) {
            console.error('[FormController] createForm:', e.message);
            if (e.message === 'FORM_TYPE_NOT_FOUND') res.status(404).json({ error: 'Form type not found' });
            else res.status(500).json({ error: 'Failed to create form' });
        }
    };

    saveDraft = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        const form_type_id = req.body.form_type_id || req.params.type_id;
        const { form_data, id } = req.body;
        if (!form_type_id) { res.status(400).json({ error: 'form_type_id is required' }); return; }

        try {
            const form = await this.formService.saveDraft({
                form_type_id: Number(form_type_id),
                form_data: form_data || {},
                userId,
            }, id ? Number(id) : undefined);
            res.status(200).json(form);
        } catch (e: any) {
            console.error('[FormController] saveDraft:', e.message);
            res.status(500).json({ error: 'Failed to save draft' });
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
            else if (e.message === 'UNAUTHORIZED_ROLE') res.status(403).json({ error: 'You do not have an authorized role to approve this form.' });
            else res.status(500).json({ error: e.message || 'Failed to update status' });
        }
    };

    deleteForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const id = Number(req.params.id);
        const roles = req.user?.roles || [];
        const userId = req.user?.userId;

        try {
            await this.formService.deleteForm(id, roles, userId);
            res.json({ message: 'Form deleted successfully' });
        } catch (e: any) {
            console.error('[FormController] deleteForm:', e.message);
            if (e.message === 'UNAUTHORIZED') res.status(403).json({ error: 'You do not have permission to delete this form' });
            else res.status(500).json({ error: 'Failed to delete form' });
        }
    }

    // ── Forward Form ──────────────────────────────────────────────────────

    forwardForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const formId = Number(req.params.id);
        const userId = req.user?.userId;
        const { toUserId, note } = req.body;

        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        if (!toUserId) { res.status(400).json({ error: 'toUserId is required' }); return; }

        try {
            const result = await this.formService.forwardForm({
                formId,
                fromUserId: userId,
                toUserId: Number(toUserId),
                note: note || '',
            });
            res.json(result);
        } catch (e: any) {
            console.error('[FormController] forwardForm:', e.message);
            if (e.message === 'FORM_NOT_FOUND') res.status(404).json({ error: 'Form not found' });
            else if (e.message === 'TARGET_USER_NOT_FOUND') res.status(404).json({ error: 'Target user not found' });
            else if (e.message === 'FORM_ALREADY_FINALIZED') res.status(400).json({ error: 'Cannot forward a finalized form' });
            else res.status(500).json({ error: 'Failed to forward form' });
        }
    };

    // ── Search Users ──────────────────────────────────────────────────────

    searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const query = (req.query.q as string) || '';
        const formId = req.query.formId ? Number(req.query.formId) : undefined;

        try {
            const users = await this.formService.searchUsers(query, formId);
            res.json(users);
        } catch (e: any) {
            console.error('[FormController] searchUsers:', e.message);
            res.status(500).json({ error: 'Failed to search users' });
        }
    };

    getRoutingTarget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roleName = req.params.roleName as string;
        const applicantId = req.user?.userId;
        if (!applicantId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        try {
            const targetUser = await this.formService.getRoutingTarget(roleName, applicantId);
            if (!targetUser) res.status(404).json({ error: 'No user found for this role' });
            else res.json(targetUser);
        } catch (e: any) {
            console.error('[FormController] getRoutingTarget:', e.message);
            res.status(500).json({ error: 'Failed to resolve routing target' });
        }
    };

    // ── Form History ──────────────────────────────────────────────────────

    getFormHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const formId = Number(req.params.id);

        try {
            const history = await this.formService.getFormHistory(formId);
            res.json(history);
        } catch (e: any) {
            console.error('[FormController] getFormHistory:', e.message);
            if (e.message === 'FORM_NOT_FOUND') res.status(404).json({ error: 'Form not found' });
            else res.status(500).json({ error: 'Failed to get form history' });
        }
    };

    // ── System Logs (Admin only) ──────────────────────────────────────────

    getSystemLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const roles = req.user?.roles || [];
        try {
            const logs = await this.formService.getSystemLogs(roles);
            res.json(logs);
        } catch (e: any) {
            console.error('[FormController] getSystemLogs:', e.message);
            if (e.message === 'UNAUTHORIZED') res.status(401).json({ error: 'Unauthorized' });
            else res.status(500).json({ error: 'Failed to get system logs' });
        }
    };

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
