// ─── FormService ──────────────────────────────────────────────────────────────
// Contains ALL form/application business logic. No Express types here.
// Depends on IFormRepository and IWorkflowService (Dependency Inversion).
// Single Responsibility: form application rules and orchestration only.

import { IFormService } from './IFormService';
import { IFormRepository } from '../repositories/IFormRepository';
import { IWorkflowService } from './IWorkflowService';
import { CreateFormDto, UpdateFormStatusDto, CreateFormTypeDto, WorkflowStepDto } from '../dtos/FormDto';

export class FormService implements IFormService {
    // Dependency Injection: receives abstractions, not concrete classes
    constructor(
        private readonly formRepo: IFormRepository,
        private readonly workflowService: IWorkflowService
    ) { }

    private buildFormDataSnapshot(formType: any, formData: Record<string, any> = {}): Record<string, any> {
        const safeFormData = formData && typeof formData === 'object' && !Array.isArray(formData)
            ? formData
            : {};

        const workflowSteps = Array.isArray(formType?.workflow?.steps)
            ? formType.workflow.steps.map((step: any) => ({
                id: step.id,
                step_order: step.step_order,
                step_name: step.step_name,
                approval_roles: step.approval_roles || [],
                is_terminal: step.is_terminal === true,
            }))
            : [];

        return {
            ...safeFormData,
            __form_meta: {
                form_type_id: formType?.id ?? null,
                form_type_name: formType?.name ?? '',
                schema_definition: formType?.schema_definition || {},
                workflow_steps: workflowSteps,
            }
        };
    }

    // ── Form Types ─────────────────────────────────────────────────────────

    async getFormTypes(roles: string[] = []): Promise<any[]> {
        const isAdmin = roles.includes('ADMIN');
        return this.formRepo.findAllFormTypes(isAdmin ? {} : { is_active: true });
    }

    async createFormType(dto: CreateFormTypeDto): Promise<any> {
        return this.formRepo.runTransaction(async (tx: any) => {
            let workflowId: number | null = null;

            if (dto.workflow_steps && dto.workflow_steps.length > 0) {
                const workflow = await tx.workflows.create({
                    data: {
                        name: dto.workflow_name || `${dto.name} Workflow`,
                        description: `Workflow for ${dto.name}`,
                    }
                });
                workflowId = workflow.id;

                for (let i = 0; i < dto.workflow_steps.length; i++) {
                    const step: WorkflowStepDto = dto.workflow_steps[i];
                    await tx.workflow_steps.create({
                        data: {
                            workflow_id: workflow.id,
                            step_order: i + 1,
                            step_name: step.step_name,
                            approval_roles: step.approval_roles || [],
                            is_terminal: step.is_terminal || false,
                        }
                    });
                }
            }

            return tx.form_types.create({
                data: {
                    name: dto.name,
                    description: dto.description || '',
                    schema_definition: dto.schema_definition || {},
                    workflow_id: workflowId,
                    is_active: dto.is_active !== undefined ? dto.is_active : true,
                },
                include: {
                    workflow: {
                        include: { steps: { orderBy: { step_order: 'asc' } } }
                    }
                }
            });
        });
    }

    async updateFormType(id: number, dto: CreateFormTypeDto): Promise<any> {
        return this.formRepo.runTransaction(async (tx: any) => {
            const existing = await tx.form_types.findUnique({
                where: { id },
                include: { workflow: true }
            });
            if (!existing) throw new Error('FORM_TYPE_NOT_FOUND');

            let workflowId: number | null = existing.workflow_id;

            if (dto.workflow_steps && dto.workflow_steps.length > 0) {
                if (workflowId) {
                    await tx.workflow_steps.deleteMany({ where: { workflow_id: workflowId } });
                    await tx.workflows.update({
                        where: { id: workflowId },
                        data: { name: `${dto.name} Workflow` }
                    });
                } else {
                    const workflow = await tx.workflows.create({
                        data: { name: `${dto.name} Workflow`, description: `Workflow for ${dto.name}` }
                    });
                    workflowId = workflow.id;
                }

                for (let i = 0; i < dto.workflow_steps.length; i++) {
                    const step: WorkflowStepDto = dto.workflow_steps[i];
                    await tx.workflow_steps.create({
                        data: {
                            workflow_id: workflowId!,
                            step_order: i + 1,
                            step_name: step.step_name,
                            approval_roles: step.approval_roles || [],
                            is_terminal: step.is_terminal || false,
                        }
                    });
                }
            }

            return tx.form_types.update({
                where: { id },
                data: {
                    name: dto.name,
                    description: dto.description || '',
                    schema_definition: dto.schema_definition || {},
                    workflow_id: workflowId,
                    is_active: dto.is_active !== undefined ? dto.is_active : undefined,
                },
                include: {
                    workflow: { include: { steps: { orderBy: { step_order: 'asc' } } } }
                }
            });
        });
    }

    async deleteFormType(id: number, roles: string[]): Promise<void> {
        if (!roles.includes('ADMIN')) {
            throw new Error('UNAUTHORIZED');
        }
        await this.formRepo.deleteFormType(id);
    }

    // ── Forms ──────────────────────────────────────────────────────────────

    /** Role-based filtering: ADMIN sees all, others see own + pending approvals they are assigned to. */
    async getForms(userId: number, roles: string[]): Promise<any[]> {
        const isAdmin = roles.includes('ADMIN');

        const whereClause = isAdmin
            ? {}
            : {
                OR: [
                    { submitted_by: userId },
                    { form_approvals: { some: { approved_by: userId } } }
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
            // Update an existing draft and promote it to SUBMITTED
            form = await this.formRepo.updateStatus(id, 'SUBMITTED', { 
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

        // Trigger workflow: advance to first step
        await this.workflowService.advanceWorkflow(form.id, 1);

        return this.formRepo.findById(form.id);
    }

    async saveDraft(dto: CreateFormDto, id?: number): Promise<any> {
        const formType = await this.formRepo.findFormTypeById(dto.form_type_id);
        if (!formType) throw new Error('FORM_TYPE_NOT_FOUND');

        return this.formRepo.saveDraft({
            ...dto,
            form_data: this.buildFormDataSnapshot(formType, dto.form_data as Record<string, any>)
        }, id);
    }

    async updateFormStatus(dto: UpdateFormStatusDto): Promise<any> {
        const form = await this.formRepo.findById(dto.formId);
        if (!form) throw new Error('FORM_NOT_FOUND');

        // ── REJECTION ──────────────────────────────────────────────────────
        if (dto.decision === 'REJECTED') {
            const pendingApproval = await this.formRepo.findPendingApproval(dto.formId);
            if (pendingApproval) {
                await this.formRepo.updateApproval(pendingApproval.id, {
                    decision: 'REJECTED',
                    remarks: dto.remarks || '',
                    decided_at: new Date(),
                    approved_by: dto.userId,
                });
            }
            return this.formRepo.updateStatus(dto.formId, 'REJECTED');
        }

        // ── APPROVAL ───────────────────────────────────────────────────────
        const pendingApproval = await this.formRepo.findPendingApproval(dto.formId);
        if (!pendingApproval) {
            throw new Error('NO_PENDING_APPROVAL');
        }

        const mergedFormData = {
            ...((form.form_data as any) || {}),
            ...(dto.approvalData || {})
        };

        await this.formRepo.updateApproval(pendingApproval.id, {
            decision: 'APPROVED',
            remarks: dto.remarks || '',
            decided_at: new Date(),
            approved_by: dto.userId,
            approval_data: dto.approvalData || {}
        });

        // Advance or finalize based on workflow step
        const workflow = form.form_types?.workflow;
        if (workflow?.steps) {
            const currentStep = workflow.steps.find((s: any) => s.step_name === pendingApproval.stage);

            if (currentStep) {
                if (currentStep.is_terminal) {
                    await this.workflowService.finalizeForm(form);
                    return this.formRepo.updateStatus(dto.formId, 'APPROVED', { form_data: mergedFormData });
                } else {
                    await this.formRepo.updateFormData(dto.formId, mergedFormData);
                    await this.workflowService.advanceWorkflow(dto.formId, currentStep.step_order + 1);
                    return this.formRepo.findById(dto.formId);
                }
            }
        }

        return this.formRepo.updateStatus(dto.formId, 'APPROVED', { form_data: mergedFormData });
    }

    async deleteForm(id: number, roles: string[], userId?: number): Promise<void> {
        const form = await this.formRepo.findById(id);
        if (!form) throw new Error('FORM_NOT_FOUND');

        const isAdmin = roles.includes('ADMIN');
        const isOwnerDraft = form.submitted_by === userId && form.current_status === 'DRAFT';

        if (!isAdmin && !isOwnerDraft) {
            throw new Error('UNAUTHORIZED');
        }
        await this.formRepo.delete(id);
    }
}
