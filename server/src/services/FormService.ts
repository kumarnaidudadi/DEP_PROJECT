// ─── FormService ──────────────────────────────────────────────────────────────
// Contains ALL form/application business logic.
// Dynamic forwarding system: users manually forward forms to next approvers.
// Role-based validation ensures only authorized users can approve.
//
// DB tables: applied_forms, form_types, form_forwards, form_history, office_orders
// Users table: `name` (single column), `email`, BigInt IDs.

import { IFormService } from './IFormService';
import { IFormRepository } from '../repositories/IFormRepository';
import { IEmailService, EmailMetadata } from './IEmailService';
import { CreateFormDto, UpdateFormStatusDto, CreateFormTypeDto, ForwardFormDto } from '../dtos/FormDto';

export class FormService implements IFormService {
    constructor(
        private readonly formRepo: IFormRepository,
        private readonly emailService: IEmailService
    ) { }

    private buildFormDataSnapshot(formType: any, formData: Record<string, any> = {}): Record<string, any> {
        const safeFormData = formData && typeof formData === 'object' && !Array.isArray(formData)
            ? formData
            : {};

        return {
            ...safeFormData,
            __form_meta: {
                form_type_id: formType?.id ?? null,
                form_type_name: formType?.name ?? '',
                schema_definition: formType?.schema || {},
                approval_rules: formType?.approval_rules || {},
            }
        };
    }

    // ── Form Types ─────────────────────────────────────────────────────────

    async getFormTypes(roles: string[] = []): Promise<any[]> {
        // Admin users see all forms; regular users see only active forms
        const isAdmin = roles.includes('ADMIN');
        const allForms = await this.formRepo.findAllFormTypes({});
        
        if (isAdmin) {
            return allForms;
        }
        
        // Filter to show only active forms to non-admin users
        return allForms.filter((form: any) => form.is_active !== false);
    }

    async createFormType(dto: CreateFormTypeDto): Promise<any> {
        return this.formRepo.createFormType({
            name: dto.name,
            description: dto.description || '',
            schema: dto.schema || {},
            approval_rules: dto.approval_rules || {},
        });
    }

    async updateFormType(id: number, dto: CreateFormTypeDto): Promise<any> {
        const existing = await this.formRepo.findFormTypeById(id);
        if (!existing) throw new Error('FORM_TYPE_NOT_FOUND');

        const updateData: any = {
            name: dto.name,
            description: dto.description || '',
            schema: dto.schema || {},
            updated_at: new Date(),
        };
        if (dto.approval_rules !== undefined) {
            updateData.approval_rules = dto.approval_rules;
        }
        if (dto.is_active !== undefined) {
            updateData.is_active = dto.is_active;
        }

        return this.formRepo.updateFormType(id, updateData);
    }

    async deleteFormType(id: number, roles: string[]): Promise<void> {
        if (!roles.includes('ADMIN')) {
            throw new Error('UNAUTHORIZED');
        }
        await this.formRepo.deleteFormType(id);
    }

    // ── Forms ──────────────────────────────────────────────────────────────

    /** Role-based filtering: ADMIN sees all, others see own + forwarded to them. */
    async getForms(userId: number, roles: string[]): Promise<any[]> {
        const isAdmin = roles.includes('ADMIN');

        const whereClause = isAdmin
            ? {}
            : {
                OR: [
                    { applicant_id: BigInt(userId) },
                    { form_forwards: { some: { forwarded_to: BigInt(userId) } } }
                ]
            };

        return this.formRepo.findAll(whereClause);
    }

    async getFormById(id: number): Promise<any> {
        const form = await this.formRepo.findById(id);
        if (!form) throw new Error('FORM_NOT_FOUND');
        return form;
    }

    async createForm(dto: CreateFormDto, id?: number): Promise<any> {
        const formType = await this.formRepo.findFormTypeById(dto.form_type_id);
        if (!formType) throw new Error('FORM_TYPE_NOT_FOUND');
        const formDataWithSnapshot = this.buildFormDataSnapshot(formType, dto.form_data as Record<string, any>);

        let form;
        if (id) {
            // Update an existing draft and promote it to submitted
            form = await this.formRepo.updateStatus(id, 'submitted', {
                form_data: formDataWithSnapshot,
                submitted_at: new Date()
            });
        } else {
            // Create a brand new submission
            form = await this.formRepo.create({
                ...dto,
                form_data: formDataWithSnapshot,
            });
        }

        // Log history
        await this.formRepo.createStatusHistory({
            applied_form_id: BigInt(form.id),
            action: 'submitted',
            changed_by: BigInt(dto.userId),
            new_data: { status: 'submitted' },
        });

        // ── Initial Forwarding ──
        if (dto.toUserId) {
            await this.forwardForm({
                formId: Number(form.id),
                fromUserId: dto.userId,
                toUserId: dto.toUserId,
                note: dto.note || 'Initial submission'
            });
        }

        return this.formRepo.findById(Number(form.id));
    }

    async saveDraft(dto: CreateFormDto, id?: number): Promise<any> {
        const formType = await this.formRepo.findFormTypeById(dto.form_type_id);
        if (!formType) throw new Error('FORM_TYPE_NOT_FOUND');

        return this.formRepo.saveDraft({
            ...dto,
            form_data: this.buildFormDataSnapshot(formType, dto.form_data as Record<string, any>)
        }, id);
    }

    // ── Dynamic Forwarding ────────────────────────────────────────────────

    async forwardForm(dto: ForwardFormDto): Promise<any> {
        const form = await this.formRepo.findById(dto.formId);
        if (!form) throw new Error('FORM_NOT_FOUND');

        // Cannot forward terminal-state forms
        if (['approved', 'rejected'].includes((form.status || '').toLowerCase())) {
            throw new Error('FORM_ALREADY_FINALIZED');
        }

        // Validate that the target user exists
        const toUser = await this.formRepo.findUserById(dto.toUserId);
        if (!toUser) throw new Error('TARGET_USER_NOT_FOUND');

        // Create forward record
        await this.formRepo.createForward({
            form_id: BigInt(dto.formId),
            forwarded_by: BigInt(dto.fromUserId),
            forwarded_to: BigInt(dto.toUserId),
            note: dto.note || '',
            action: 'forwarded',
        });

        // Update form status to forwarded
        const oldStatus = form.status;
        await this.formRepo.updateStatus(dto.formId, 'forwarded');

        // Log history
        await this.formRepo.createStatusHistory({
            applied_form_id: BigInt(dto.formId),
            action: 'forwarded',
            changed_by: BigInt(dto.fromUserId),
            old_data: { status: oldStatus },
            new_data: { status: 'forwarded', forwarded_to: dto.toUserId },
            remarks: dto.note || '',
        });

        // Notify the target user
        if (toUser.email) {
            try {
                const applicantName = [form.users?.first_name, form.users?.last_name].filter(Boolean).join(' ') || 'Unknown';
                const metadata: EmailMetadata = {
                    requestId: Number(form.id),
                    applicantName,
                    formType: form.form_types?.name || 'Unknown',
                    currentStep: 'Review',
                    status: 'PENDING',
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/pending`,
                    timestamp: new Date()
                };
                this.emailService.sendEmailNotification('REQUEST_ASSIGNED', toUser.email, metadata).catch(e => console.error(e));
            } catch (err) {
                console.error('Failed to send forwarding email:', err);
            }
        }

        return this.formRepo.findById(dto.formId);
    }

    // ── Approve / Reject ──────────────────────────────────────────────────

    async updateFormStatus(dto: UpdateFormStatusDto): Promise<any> {
        const form = await this.formRepo.findById(dto.formId);
        if (!form) throw new Error('FORM_NOT_FOUND');

        const userRoles = await this.formRepo.getUserRoles(dto.userId);
        const rawSchema = (form.form_types?.schema as any) || {};
        const approvalRules = (form.form_types?.approval_rules as any) || {};
        
        let requiredRoles: string[] = [];
        
        // Try schema.approval_roles first
        if (Array.isArray(rawSchema.approval_roles)) {
            requiredRoles = rawSchema.approval_roles;
        } else if (rawSchema.approval_roles && typeof rawSchema.approval_roles === 'object') {
            // Handle { "ROLE_NAME": true } format
            requiredRoles = Object.entries(rawSchema.approval_roles)
                .filter(([_, v]) => v === true)
                .map(([k, _]) => k);
        }
        
        // Fallback to approval_rules if empty
        if (requiredRoles.length === 0 && Array.isArray(approvalRules.required_roles)) {
            requiredRoles = approvalRules.required_roles;
        }

        // Check if user has at least one required role (skip check if no rules defined)
        if (requiredRoles.length > 0) {
            const hasAuthority = userRoles.some(role =>
                requiredRoles.some(req => req.toUpperCase() === role.toUpperCase())
            );
            // Also allow ADMIN
            if (!hasAuthority && !userRoles.includes('ADMIN')) {
                throw new Error('UNAUTHORIZED_ROLE');
            }
        }

        const oldStatus = form.status;

        // ── REJECTION ──────────────────────────────────────────────────────
        if (dto.decision === 'REJECTED') {
            // Log as a rejection forward
            await this.formRepo.createForward({
                form_id: BigInt(dto.formId),
                forwarded_by: BigInt(dto.userId),
                forwarded_to: BigInt(form.applicant_id || dto.userId),
                action: 'rejected',
                remarks: dto.remarks || '',
            });

            const result = await this.formRepo.updateStatus(dto.formId, 'rejected');

            await this.formRepo.createStatusHistory({
                applied_form_id: BigInt(dto.formId),
                action: 'rejected',
                changed_by: BigInt(dto.userId),
                old_data: { status: oldStatus },
                new_data: { status: 'rejected' },
                remarks: dto.remarks || '',
            });

            this.notifyApplicant(form, 'rejected');
            return result;
        }

        // ── APPROVAL ───────────────────────────────────────────────────────

        // Merge approval data into form_data
        const mergedFormData = {
            ...((form.form_data as any) || {}),
            ...(dto.approvalData || {})
        };

        // Log approval via form_forwards with action = 'approved'
        await this.formRepo.createForward({
            form_id: BigInt(dto.formId),
            forwarded_by: BigInt(dto.userId),
            forwarded_to: BigInt(form.applicant_id || dto.userId),
            action: 'approved',
            remarks: dto.remarks || '',
        });

        // Check if ALL required roles have approved
        const allForwards = await this.formRepo.findForwardsByForm(dto.formId);
        const approvedRoles = new Set<string>();

        for (const fwd of allForwards) {
            if (fwd.action === 'approved' && fwd.forwarded_by) {
                const roles = await this.formRepo.getUserRoles(Number(fwd.forwarded_by));
                roles.forEach((r: string) => approvedRoles.add(r.toUpperCase()));
            }
        }

        const allRequiredMet = requiredRoles.length === 0 ||
            requiredRoles.every(req => approvedRoles.has(req.toUpperCase()));

        if (allRequiredMet) {
            // All required roles approved → finalize
            await this.finalizeForm(form);
            const result = await this.formRepo.updateStatus(dto.formId, 'approved', { form_data: mergedFormData });

            await this.formRepo.createStatusHistory({
                applied_form_id: BigInt(dto.formId),
                action: 'approved',
                changed_by: BigInt(dto.userId),
                old_data: { status: oldStatus },
                new_data: { status: 'approved' },
                remarks: dto.remarks || '',
            });

            return result;
        } else {
            // Not all required roles approved yet
            await this.formRepo.updateFormData(dto.formId, mergedFormData);
            await this.formRepo.updateStatus(dto.formId, 'partially_approved');

            await this.formRepo.createStatusHistory({
                applied_form_id: BigInt(dto.formId),
                action: 'partially_approved',
                changed_by: BigInt(dto.userId),
                old_data: { status: oldStatus },
                new_data: { status: 'partially_approved' },
                remarks: dto.remarks || '',
            });

            return this.formRepo.findById(dto.formId);
        }
    }

    // ── Finalize ─────────────────────────────────────────────────────────

    private async finalizeForm(form: any): Promise<void> {
        const orderNumber = `OO-${form.id}-${Date.now().toString().slice(-6)}`;
        const existingOrder = await this.formRepo.findOfficeOrder(Number(form.id));

        if (!existingOrder) {
            await this.formRepo.createOfficeOrder({
                applied_form_id: BigInt(form.id),
                order_number: orderNumber,
                generated_by: BigInt(form.applicant_id || 1),
            });
        }

        this.notifyApplicant(form, 'approved');
    }

    private notifyApplicant(form: any, status: string): void {
        const applicant = form.users;
        if (applicant && applicant.email) {
            try {
                const metadata: EmailMetadata = {
                    requestId: Number(form.id),
                    applicantName: [applicant.first_name, applicant.last_name].filter(Boolean).join(' ') || 'Unknown',
                    formType: form.form_types?.name || 'Unknown',
                    status,
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/all/${form.id}`,
                    timestamp: new Date()
                };
                const eventType = status === 'approved' ? 'REQUEST_COMPLETED' : 'REQUEST_REJECTED';
                this.emailService.sendEmailNotification(eventType, applicant.email, metadata).catch(e => console.error(e));
            } catch (err) {
                console.error(`Failed to send ${status} notification:`, err);
            }
        }
    }

    // ── Search Users ──────────────────────────────────────────────────────

    async searchUsers(query: string): Promise<any[]> {
        const users = await this.formRepo.searchUsers(query);
        return users.map((u: any) => ({
            id: Number(u.id),
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || '',
            email: u.email,
            department: null,
            roles: u.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [],
        }));
    }

    // ── History ────────────────────────────────────────────────────────────

    async getFormHistory(formId: number): Promise<any> {
        const form = await this.formRepo.findById(formId);
        if (!form) throw new Error('FORM_NOT_FOUND');

        const forwards = await this.formRepo.findForwardsByForm(formId);

        return {
            forwards,
            history: form.form_history || [],
        };
    }

    async getSystemLogs(roles: string[]): Promise<any[]> {
        if (!roles.includes('ADMIN')) {
            throw new Error('UNAUTHORIZED');
        }
        return this.formRepo.getSystemLogs();
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    async deleteForm(id: number, roles: string[], userId?: number): Promise<void> {
        const form = await this.formRepo.findById(id);
        if (!form) throw new Error('FORM_NOT_FOUND');

        const isAdmin = roles.includes('ADMIN');
        const isOwnerDraft = Number(form.applicant_id) === userId && (form.status || '').toLowerCase() === 'draft';

        if (!isAdmin && !isOwnerDraft) {
            throw new Error('UNAUTHORIZED');
        }
        await this.formRepo.delete(id);
    }
}
