import fs from 'fs';
const content = `import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ─── HELPER: WORKFLOW ENGINE ─────────────────────────────────────────
async function finalizeForm(form: any) {
    const orderNumber = \`OO-\${form.id}-\${Date.now().toString().slice(-6)}\`;
    
    const existingOrder = await prisma.office_orders.findFirst({
        where: { form_id: form.id }
    });
    
    if (!existingOrder) {
        await prisma.office_orders.create({
            data: {
                form_id: form.id,
                order_number: orderNumber,
                issued_by: form.submitted_by || 1, // System or Admin ID
            }
        });
    }
}

async function advanceWorkflow(formId: number, nextStepOrder: number) {
    const form = await prisma.forms.findUnique({
        where: { id: formId },
        include: {
            form_types: {
                include: {
                    workflow: {
                        include: {
                            steps: {
                                orderBy: { step_order: 'asc' }
                            }
                        }
                    }
                }
            },
            users: true
        }
    });

    if (!form || !form.form_types?.workflow) {
        // No workflow, mark as approved
        await prisma.forms.update({
            where: { id: formId },
            data: { current_status: 'APPROVED' }
        });
        return;
    }

    const workflow = form.form_types.workflow;
    const steps = workflow.steps;
    
    // Find the target step by step_order
    const step = steps.find((s: any) => s.step_order === nextStepOrder);

    if (!step) {
        // No more steps, maybe it's fully approved implicitly?
        await prisma.forms.update({
            where: { id: form.id },
            data: { current_status: 'APPROVED' }
        });
        return;
    }

    // Update form's current_status to the step's name
    await prisma.forms.update({
        where: { id: form.id },
        data: { current_status: step.step_name }
    });

    const approvalRoles = step.approval_roles || [];

    if (approvalRoles.length === 0) {
        // No approvers needed for this step. Automatically bypass.
        if (step.is_terminal) {
            // Generate office order
            await finalizeForm(form);
            await prisma.forms.update({
                where: { id: form.id },
                data: { current_status: 'APPROVED' }
            });
        } else {
            // Move to next step
            await advanceWorkflow(form.id, nextStepOrder + 1);
        }
    } else {
        // Need approvals
        let assignedApproverId: number | null = null;
        
        for (const role of approvalRoles) {
            if (role === 'HEAD_OF_DEPARTMENT') {
                if (form.users?.department_id) {
                    const hod = await prisma.department_heads.findFirst({
                        where: { 
                            department_id: form.users.department_id,
                            role_type: 'HEAD_OF_DEPARTMENT',
                            is_active: true
                        }
                    });
                    if (hod) {
                        assignedApproverId = hod.user_id;
                        break;
                    }
                }
            } else {
                // If the role is something else, check if there's a user associated with that role via department_heads or user_roles
                const deptHead = await prisma.department_heads.findFirst({
                    where: {
                        role_type: role,
                        is_active: true,
                        ...(form.users?.department_id ? { department_id: form.users.department_id } : {})
                    }
                });
                
                if (deptHead) {
                    assignedApproverId = deptHead.user_id;
                    break;
                } else {
                    const userRole = await prisma.user_roles.findFirst({
                        where: {
                            roles: { name: { equals: role, mode: 'insensitive' } }
                        }
                    });
                    if (userRole) {
                        assignedApproverId = userRole.user_id;
                        break;
                    }
                }
            }
        }
        
        await prisma.form_approvals.create({
            data: {
                form_id: form.id,
                stage: step.step_name,
                decision: 'PENDING',
                approved_by: assignedApproverId
            }
        });
    }
}


// ─── CREATE APPLICATION ──────────────────────────────────────────────
export async function createApplication(req: AuthenticatedRequest, res: Response) {
    try {
        let { form_type_id, form_data } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!form_data) return res.status(400).json({ error: 'Missing form data' });

        const leaveType = form_data.leave_type || 'General Application';

        let formType = await prisma.form_types.findFirst({
            where: { name: { equals: leaveType, mode: 'insensitive' } }
        });

        if (!formType) {
            console.log(\`[AppController] Form type '\${leaveType}' not found. Creating it...\`);
            formType = await prisma.form_types.create({
                data: {
                    name: leaveType,
                    description: \`Auto-generated for \${leaveType}\`,
                    schema_definition: {}
                }
            });
        }

        form_type_id = formType.id;

        const application = await prisma.forms.create({
            data: {
                form_type_id: Number(form_type_id),
                submitted_by: userId,
                form_data: form_data,
                current_status: 'SUBMITTED',
                submitted_at: new Date(),
            },
        });

        // Initialize workflow
        await advanceWorkflow(application.id, 1);

        const updatedApplication = await prisma.forms.findUnique({ where: { id: application.id } });
        res.status(201).json(updatedApplication);
    } catch (error: any) {
        console.error('Create Application Error:', error);
        res.status(500).json({ error: 'Failed to create application' });
    }
}

// ─── GET APPLICATIONS ────────────────────────────────────────────────
export async function getApplications(req: AuthenticatedRequest, res: Response) {
    try {
        const userId = req.user?.userId;
        const userRoles = req.user?.roles || [];

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let whereClause: any = {};

        if (userRoles.includes('ADMIN')) {
            // Admin sees all
            whereClause = {};
        } else {
            // Applicant sees own forms OR forms pending their approval OR previously approved by them
            whereClause = {
                OR: [
                    { submitted_by: userId },
                    {
                        form_approvals: {
                            some: {
                                approved_by: userId
                            }
                        }
                    }
                ]
            };
        }

        const applications = await prisma.forms.findMany({
            where: whereClause,
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
                users: {
                    select: { first_name: true, last_name: true, email: true }
                },
                form_approvals: {
                    orderBy: { decided_at: 'desc' },
                }
            },
            orderBy: { submitted_at: 'desc' },
        });

        res.json(applications);
    } catch (error) {
        console.error('Get Applications Error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
}

// ─── UPDATE STATUS (APPROVE/REJECT) ──────────────────────────────────
export async function updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const userId = req.user?.userId;
        const signatureFile = req.file;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const formId = Number(id);

        const form = await prisma.forms.findUnique({
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
                }
            }
        });

        if (!form) return res.status(404).json({ error: 'Form not found' });

        // Find pending approval
        const pendingApproval = await prisma.form_approvals.findFirst({
            where: {
                form_id: formId,
                decision: 'PENDING'
            },
            orderBy: { id: 'desc' }
        });

        if (status === 'REJECTED') {
            if (pendingApproval) {
                await prisma.form_approvals.update({
                    where: { id: pendingApproval.id },
                    data: {
                        decision: 'REJECTED',
                        remarks: remarks || '',
                        decided_at: new Date(),
                        approved_by: userId,
                    }
                });
            }
            const updatedForm = await prisma.forms.update({
                where: { id: formId },
                data: { current_status: 'REJECTED', updated_at: new Date() }
            });
            return res.json(updatedForm);
        }

        // Processing Approval
        if (!pendingApproval) {
             return res.status(400).json({ error: 'No pending approval stage found for this form.' });
        }

        const approvalData: any = {};
        if (signatureFile) {
            approvalData.signature_url = \`/uploads/signatures/\${signatureFile.filename}\`;
        }

        await prisma.form_approvals.update({
            where: { id: pendingApproval.id },
            data: {
                decision: 'APPROVED',
                remarks: remarks || '',
                decided_at: new Date(),
                approved_by: userId,
                approval_data: approvalData
            }
        });

        const workflow = form.form_types?.workflow;
        if (workflow && workflow.steps) {
            // Find the current step based on the pendingApproval stage
            const stepNameStr = pendingApproval.stage;
            const currentStep = workflow.steps.find((s: any) => s.step_name === stepNameStr);
            
            if (currentStep) {
                if (currentStep.is_terminal) {
                    await finalizeForm(form);
                    await prisma.forms.update({
                        where: { id: formId },
                        data: { current_status: 'APPROVED', updated_at: new Date() }
                    });
                } else {
                    // Try to advance to the next step numerically
                    await advanceWorkflow(formId, currentStep.step_order + 1);
                }
            } else {
                 await prisma.forms.update({
                     where: { id: formId },
                     data: { current_status: 'APPROVED', updated_at: new Date() }
                 });
            }
        } else {
            // No workflow configured
            await prisma.forms.update({
                where: { id: formId },
                data: { current_status: 'APPROVED', updated_at: new Date() }
            });
        }

        const refreshedForm = await prisma.forms.findUnique({ where: { id: formId } });
        res.json(refreshedForm);
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
}
`;
fs.writeFileSync('/Users/tharun/WebDev/DEP_PROJECT/server/src/controllers/ApplicationController.ts', content);
