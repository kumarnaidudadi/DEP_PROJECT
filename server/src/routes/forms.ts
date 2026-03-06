import express from 'express';
import prisma from '../prisma';
import { verifyToken } from '../middleware/authMiddleware';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Response } from 'express';

const router = express.Router();

// ─── GET all form types (with workflow steps) ──────────────────────────
router.get('/types', async (req, res) => {
    try {
        const types = await prisma.form_types.findMany({
            where: { is_active: true },
            include: {
                workflow: {
                    include: {
                        steps: { orderBy: { step_order: 'asc' } }
                    }
                }
            }
        });
        res.json(types);
    } catch (error) {
        console.error('Fetch form types error:', error);
        res.status(500).json({ error: 'Failed to fetch form types' });
    }
});

// ─── CREATE a new form type + workflow ──────────────────────────────────
router.post('/types', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, schema_definition, workflow_name, workflow_steps } = req.body;

    if (!name) return res.status(400).json({ error: 'Form type name is required' });

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create workflow if steps are provided
            let workflowId: number | null = null;

            if (workflow_steps && workflow_steps.length > 0) {
                const workflow = await tx.workflows.create({
                    data: {
                        name: workflow_name || `${name} Workflow`,
                        description: `Workflow for ${name}`,
                    }
                });
                workflowId = workflow.id;

                // 2. Create workflow steps
                for (let i = 0; i < workflow_steps.length; i++) {
                    await tx.workflow_steps.create({
                        data: {
                            workflow_id: workflow.id,
                            step_order: i + 1,
                            step_name: workflow_steps[i].step_name,
                            approver_role: workflow_steps[i].approver_role || null,
                            is_terminal: workflow_steps[i].is_terminal || false,
                        }
                    });
                }
            }

            // 3. Create form type
            const formType = await tx.form_types.create({
                data: {
                    name,
                    description: description || '',
                    schema_definition: schema_definition || {},
                    workflow_id: workflowId,
                },
                include: {
                    workflow: {
                        include: { steps: { orderBy: { step_order: 'asc' } } }
                    }
                }
            });

            return formType;
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Create form type error:', error);
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'A form type with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create form type' });
    }
});

// ─── GET all forms (filtered by role) ──────────────────────────────────
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRoles = req.user?.roles || [];

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        let whereClause: any = {};

        if (userRoles.includes('ADMIN') || userRoles.includes('HOD') || userRoles.includes('APPROVER')) {
            // Admin/HOD/Approver see all
            whereClause = {};
        } else {
            // Student/Applicant sees only their own
            whereClause = { submitted_by: userId };
        }

        const formList = await prisma.forms.findMany({
            where: whereClause,
            include: {
                form_types: {
                    include: {
                        workflow: {
                            include: { steps: { orderBy: { step_order: 'asc' } } }
                        }
                    }
                },
                users: {
                    select: { first_name: true, last_name: true, email: true }
                },
                form_approvals: {
                    orderBy: { decided_at: 'desc' }
                }
            },
            orderBy: { updated_at: 'desc' }
        });

        res.json(formList);
    } catch (error) {
        console.error('Fetch forms error:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// ─── CREATE a new form (submit application) ────────────────────────────
router.post('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    const { form_type_id, form_data } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!form_type_id) return res.status(400).json({ error: 'form_type_id is required' });

    try {
        // Look up the form type and its workflow
        const formType = await prisma.form_types.findUnique({
            where: { id: Number(form_type_id) },
            include: {
                workflow: {
                    include: { steps: { orderBy: { step_order: 'asc' } } }
                }
            }
        });

        if (!formType) return res.status(404).json({ error: 'Form type not found' });

        // Determine initial status from workflow
        let initialStatus = 'SUBMITTED';
        if (formType.workflow && formType.workflow.steps.length > 0) {
            initialStatus = formType.workflow.steps[0].step_name;
        }

        const result = await prisma.$transaction(async (tx: any) => {
            // Create the form
            const form = await tx.forms.create({
                data: {
                    form_type_id: Number(form_type_id),
                    submitted_by: userId,
                    form_data: form_data || {},
                    current_status: initialStatus,
                    submitted_at: new Date(),
                }
            });

            // Create initial approval entry
            await tx.form_approvals.create({
                data: {
                    form_id: form.id,
                    stage: initialStatus,
                    decision: 'PENDING',
                }
            });

            // Log status history
            await tx.form_status_history.create({
                data: {
                    form_id: form.id,
                    old_status: null,
                    new_status: initialStatus,
                    changed_by: userId,
                }
            });

            return form;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create form error:', error);
        res.status(500).json({ error: 'Failed to create form' });
    }
});

// ─── GET single form ────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    try {
        const form = await prisma.forms.findUnique({
            where: { id: parseInt(id) },
            include: {
                form_types: {
                    include: {
                        workflow: {
                            include: { steps: { orderBy: { step_order: 'asc' } } }
                        }
                    }
                },
                users: {
                    select: { first_name: true, last_name: true, email: true }
                },
                form_approvals: {
                    include: { users: true },
                    orderBy: { decided_at: 'desc' }
                },
                form_status_history: {
                    include: { users: true },
                    orderBy: { changed_at: 'desc' }
                }
            }
        });
        if (!form) {
            res.status(404).json({ error: 'Form not found' });
            return;
        }
        res.json(form);
    } catch (error) {
        console.error('Get form error:', error);
        res.status(500).json({ error: 'Failed to get form' });
    }
});

// ─── UPDATE form status (Approve / Reject / Advance) ────────────────────
router.patch('/:id/status', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    const { decision, remarks } = req.body; // decision = "APPROVED" or "REJECTED"
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Get current form with workflow
            const form = await tx.forms.findUnique({
                where: { id: Number(id) },
                include: {
                    form_types: {
                        include: {
                            workflow: {
                                include: { steps: { orderBy: { step_order: 'asc' } } }
                            }
                        }
                    }
                }
            });

            if (!form) throw new Error('Form not found');

            const oldStatus = form.current_status;
            let newStatus: string;

            if (decision === 'REJECTED') {
                newStatus = 'REJECTED';
            } else {
                // APPROVED — advance to next workflow step
                const steps = form.form_types?.workflow?.steps || [];
                const currentStepIndex = steps.findIndex((s: any) => s.step_name === oldStatus);

                if (currentStepIndex === -1 || currentStepIndex >= steps.length - 1) {
                    // No more steps → mark as APPROVED
                    newStatus = 'APPROVED';
                } else {
                    const nextStep = steps[currentStepIndex + 1];
                    newStatus = nextStep.is_terminal ? 'APPROVED' : nextStep.step_name;
                }
            }

            // Update form
            const updatedForm = await tx.forms.update({
                where: { id: Number(id) },
                data: {
                    current_status: newStatus,
                    updated_at: new Date(),
                }
            });

            // Log approval
            await tx.form_approvals.create({
                data: {
                    form_id: Number(id),
                    stage: oldStatus,
                    approved_by: userId,
                    decision: decision,
                    remarks: remarks || '',
                    decided_at: new Date(),
                }
            });

            // Log status history
            await tx.form_status_history.create({
                data: {
                    form_id: Number(id),
                    old_status: oldStatus,
                    new_status: newStatus,
                    changed_by: userId,
                }
            });

            return updatedForm;
        });

        res.json(result);
    } catch (error: any) {
        console.error('Status update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update status' });
    }
});

export default router;
