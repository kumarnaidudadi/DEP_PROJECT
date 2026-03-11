// ─── WorkflowService ──────────────────────────────────────────────────────────
// Handles all workflow progression logic. This was previously embedded as
// top-level helper functions inside routes/forms.ts.
// Single Responsibility: only advances or finalizes form workflows.

import { PrismaClient } from '@prisma/client';
import { IWorkflowService } from './IWorkflowService';

export class WorkflowService implements IWorkflowService {
    constructor(private readonly prisma: PrismaClient) { }

    // ─── Finalize: Create Office Order when a form is fully approved ───────
    async finalizeForm(form: any): Promise<void> {
        const orderNumber = `OO-${form.id}-${Date.now().toString().slice(-6)}`;

        const existingOrder = await this.prisma.office_orders.findUnique({
            where: { form_id: form.id }
        });

        if (!existingOrder) {
            await this.prisma.office_orders.create({
                data: {
                    form_id: form.id,
                    order_number: orderNumber,
                    issued_by: form.submitted_by || 1,
                }
            });
        }
    }

    // ─── Advance: Move form to the next workflow step ──────────────────────
    async advanceWorkflow(formId: number, nextStepOrder: number): Promise<void> {
        const form = await this.prisma.forms.findUnique({
            where: { id: formId },
            include: {
                form_types: {
                    include: {
                        workflow: {
                            include: {
                                steps: { orderBy: { step_order: 'asc' } }
                            }
                        }
                    }
                },
                users: true
            }
        });

        // No workflow defined → auto-approve
        if (!form || !form.form_types?.workflow) {
            await this.prisma.forms.update({
                where: { id: formId },
                data: { current_status: 'APPROVED' }
            });
            return;
        }

        const workflow = form.form_types.workflow;
        const steps = workflow.steps;
        const step = steps.find((s: any) => s.step_order === nextStepOrder);

        // No more steps → final approval
        if (!step) {
            await this.prisma.forms.update({
                where: { id: form.id },
                data: { current_status: 'APPROVED' }
            });
            return;
        }

        // Move to this step's status
        await this.prisma.forms.update({
            where: { id: form.id },
            data: { current_status: step.step_name }
        });

        const approvalRoles: string[] = step.approval_roles || [];

        // If no approver roles → check terminal or skip to next step
        if (approvalRoles.length === 0) {
            if (step.is_terminal) {
                await this.finalizeForm(form);
                await this.prisma.forms.update({
                    where: { id: form.id },
                    data: { current_status: 'APPROVED' }
                });
            } else {
                await this.advanceWorkflow(form.id, nextStepOrder + 1);
            }
            return;
        }

        // Find the correct approver based on role
        let assignedApproverId: number | null = null;

        for (const role of approvalRoles) {
            const roleRecord = await this.prisma.roles.findFirst({
                where: { name: { equals: role, mode: 'insensitive' } }
            });
            const roleIdStr = roleRecord ? roleRecord.id.toString() : role;

            if (role === 'HEAD_OF_DEPARTMENT') {
                if (form.users?.department_id) {
                    const hod = await this.prisma.department_heads.findFirst({
                        where: {
                            department_id: form.users.department_id,
                            role_type: { in: ['HEAD_OF_DEPARTMENT', roleIdStr] },
                            is_active: true
                        }
                    });
                    if (hod) { assignedApproverId = hod.user_id; break; }
                }
            } else {
                const deptHead = await this.prisma.department_heads.findFirst({
                    where: {
                        role_type: { in: [role, roleIdStr] },
                        is_active: true,
                        ...(form.users?.department_id ? { department_id: form.users.department_id } : {})
                    }
                });

                if (deptHead) {
                    assignedApproverId = deptHead.user_id;
                    break;
                } else if (roleRecord) {
                    const userRole = await this.prisma.user_roles.findFirst({
                        where: { role_id: roleRecord.id }
                    });
                    if (userRole) { assignedApproverId = userRole.user_id; break; }
                }
            }
        }

        // Create a pending approval entry for the assigned approver
        await this.prisma.form_approvals.create({
            data: {
                form_id: form.id,
                stage: step.step_name,
                decision: 'PENDING',
                approved_by: assignedApproverId
            }
        });
    }
}
