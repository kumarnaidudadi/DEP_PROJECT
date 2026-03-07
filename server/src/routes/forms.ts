import express, { Response } from 'express';
import prisma from '../prisma';
import { verifyToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// ─── HELPER: WORKFLOW ENGINE ─────────────────────────────────────────
async function finalizeForm(form: any) {
    const orderNumber = `OO-${form.id}-${Date.now().toString().slice(-6)}`;

    const existingOrder = await prisma.office_orders.findUnique({
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
        await prisma.forms.update({
            where: { id: formId },
            data: { current_status: 'APPROVED' }
        });
        return;
    }

    const workflow = form.form_types.workflow;
    const steps = workflow.steps;
    const step = steps.find((s: any) => s.step_order === nextStepOrder);

    if (!step) {
        await prisma.forms.update({
            where: { id: form.id },
            data: { current_status: 'APPROVED' }
        });
        return;
    }

    await prisma.forms.update({
        where: { id: form.id },
        data: { current_status: step.step_name }
    });

    const approvalRoles = step.approval_roles || [];

    if (approvalRoles.length === 0) {
        if (step.is_terminal) {
            await finalizeForm(form);
            await prisma.forms.update({
                where: { id: form.id },
                data: { current_status: 'APPROVED' }
            });
        } else {
            await advanceWorkflow(form.id, nextStepOrder + 1);
        }
    } else {
        let assignedApproverId: number | null = null;

        for (const role of approvalRoles) {
            const roleRecord = await prisma.roles.findFirst({
                where: { name: { equals: role, mode: 'insensitive' } }
            });
            const roleIdStr = roleRecord ? roleRecord.id.toString() : role;

            if (role === 'HEAD_OF_DEPARTMENT') {
                if (form.users?.department_id) {
                    const hod = await prisma.department_heads.findFirst({
                        where: {
                            department_id: form.users.department_id,
                            role_type: { in: ['HEAD_OF_DEPARTMENT', roleIdStr] },
                            is_active: true
                        }
                    });
                    if (hod) {
                        assignedApproverId = hod.user_id;
                        break;
                    }
                }
            } else {
                const deptHead = await prisma.department_heads.findFirst({
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
                    const userRole = await prisma.user_roles.findFirst({
                        where: { role_id: roleRecord.id }
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
            let workflowId: number | null = null;
            if (workflow_steps && workflow_steps.length > 0) {
                const workflow = await tx.workflows.create({
                    data: {
                        name: workflow_name || `${name} Workflow`,
                        description: `Workflow for ${name}`,
                    }
                });
                workflowId = workflow.id;
                for (let i = 0; i < workflow_steps.length; i++) {
                    await tx.workflow_steps.create({
                        data: {
                            workflow_id: workflow.id,
                            step_order: i + 1,
                            step_name: workflow_steps[i].step_name,
                            approval_roles: workflow_steps[i].approval_roles || [],
                            is_terminal: workflow_steps[i].is_terminal || false,
                        }
                    });
                }
            }
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

// ─── PUT /types/:id — Update an existing form type ─────────────────────────
router.put('/types/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    const { name, description, schema_definition, workflow_steps } = req.body;

    if (!name) return res.status(400).json({ error: 'Form type name is required' });
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid form type id' });

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Fetch existing form type to get workflow_id
            const existing = await tx.form_types.findUnique({
                where: { id },
                include: { workflow: true }
            });
            if (!existing) throw new Error('NOT_FOUND');

            let workflowId: number | null = existing.workflow_id;

            if (workflow_steps && workflow_steps.length > 0) {
                if (workflowId) {
                    // Delete old steps and replace
                    await tx.workflow_steps.deleteMany({ where: { workflow_id: workflowId } });
                    // Update workflow name
                    await tx.workflows.update({
                        where: { id: workflowId },
                        data: { name: `${name} Workflow` }
                    });
                } else {
                    // Create a new workflow
                    const workflow = await tx.workflows.create({
                        data: { name: `${name} Workflow`, description: `Workflow for ${name}` }
                    });
                    workflowId = workflow.id;
                }
                for (let i = 0; i < workflow_steps.length; i++) {
                    await tx.workflow_steps.create({
                        data: {
                            workflow_id: workflowId!,
                            step_order: i + 1,
                            step_name: workflow_steps[i].step_name,
                            approval_roles: workflow_steps[i].approval_roles || [],
                            is_terminal: workflow_steps[i].is_terminal || false,
                        }
                    });
                }
            }

            const updated = await tx.form_types.update({
                where: { id },
                data: {
                    name,
                    description: description || '',
                    schema_definition: schema_definition || {},
                    workflow_id: workflowId,
                },
                include: {
                    workflow: { include: { steps: { orderBy: { step_order: 'asc' } } } }
                }
            });
            return updated;
        });

        res.json(result);
    } catch (error: any) {
        console.error('Update form type error:', error);
        if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Form type not found' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'A form type with this name already exists' });
        res.status(500).json({ error: 'Failed to update form type' });
    }
});

// ─── GET all forms (filtered by role) ──────────────────────────────────
router.get('/', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRoles: string[] = req.user?.roles || [];

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const isAdmin = userRoles.includes('ADMIN');

        let whereClause: any = {};

        if (isAdmin) {
            whereClause = {};
        } else {
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
                    select: { first_name: true, last_name: true, email: true, department_id: true }
                },
                form_approvals: {
                    orderBy: { decided_at: 'desc' },
                    include: { users: { select: { first_name: true, last_name: true } } }
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
        const formType = await prisma.form_types.findUnique({
            where: { id: Number(form_type_id) },
        });

        if (!formType) return res.status(404).json({ error: 'Form type not found' });

        const form = await prisma.forms.create({
            data: {
                form_type_id: Number(form_type_id),
                submitted_by: userId,
                form_data: form_data || {},
                current_status: 'SUBMITTED',
                submitted_at: new Date(),
            }
        });

        await advanceWorkflow(form.id, 1);

        const updatedForm = await prisma.forms.findUnique({ where: { id: form.id } });

        res.status(201).json(updatedForm);
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
    const { decision, remarks, approvalData } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!decision || !['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'decision must be APPROVED or REJECTED' });
    }

    try {
        const formId = Number(id);

        const form = await prisma.forms.findUnique({
            where: { id: formId },
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

        if (!form) return res.status(404).json({ error: 'Form not found' });

        const pendingApproval = await prisma.form_approvals.findFirst({
            where: {
                form_id: formId,
                decision: 'PENDING'
            },
            orderBy: { id: 'desc' }
        });

        if (decision === 'REJECTED') {
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

        const mergedFormData = { ...(form.form_data as any || {}), ...(approvalData || {}) };

        await prisma.form_approvals.update({
            where: { id: pendingApproval.id },
            data: {
                decision: 'APPROVED',
                remarks: remarks || '',
                decided_at: new Date(),
                approved_by: userId,
                approval_data: approvalData || {}
            }
        });

        const workflow = form.form_types?.workflow;
        if (workflow && workflow.steps) {
            const stepNameStr = pendingApproval.stage;
            const currentStep = workflow.steps.find((s: any) => s.step_name === stepNameStr);

            if (currentStep) {
                if (currentStep.is_terminal) {
                    await finalizeForm(form);
                    await prisma.forms.update({
                        where: { id: formId },
                        data: { current_status: 'APPROVED', updated_at: new Date(), form_data: mergedFormData }
                    });
                } else {
                    await prisma.forms.update({
                        where: { id: formId },
                        data: { form_data: mergedFormData }
                    });
                    await advanceWorkflow(formId, currentStep.step_order + 1);
                }
            } else {
                await prisma.forms.update({
                    where: { id: formId },
                    data: { current_status: 'APPROVED', updated_at: new Date(), form_data: mergedFormData }
                });
            }
        } else {
            await prisma.forms.update({
                where: { id: formId },
                data: { current_status: 'APPROVED', updated_at: new Date(), form_data: mergedFormData }
            });
        }

        const refreshedForm = await prisma.forms.findUnique({ where: { id: formId } });
        res.json(refreshedForm);
    } catch (error: any) {
        console.error('Status update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update status' });
    }
});

// ─── DOWNLOAD filled PDF ──────────────────────────────────────────────────
router.get('/:id/download', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const id = Number(req.params.id);
        const form = await prisma.forms.findUnique({
            where: { id },
            include: { users: true, form_approvals: true }
        });

        if (!form) return res.status(404).json({ error: 'Form not found' });

        // Currently hardcoding the Air India template for demo purposes
        // In a real scenario, map form_type.name to the specific template file
        const templatePath = path.join(__dirname, '../../../forms/Permission to travel by airline other than air india.pdf');

        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: 'PDF template not found on server' });
        }

        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const p = pages[0]; // Assuming one-page form
        const { height } = p.getSize();

        // Helper to draw text using traditional Top-Left as (0,0) (converts to bottom-left automatically)
        const draw = (txt: string | null | undefined, x: number, y: number, size = 11) => {
            if (!txt) return;
            p.drawText(String(txt), { x, y: height - y, size, color: rgb(0.1, 0.25, 0.5) }); // Dark blue to easily see injected text
        };

        const fd = form.form_data as any;

        const getFd = (keySub: string) => {
            const keys = Object.keys(fd || {});
            const found = keys.find(k => k.toLowerCase().includes(keySub.toLowerCase()));
            return found ? fd[found] : '';
        };

        const nameText = fd.Name || form.users?.first_name || '';
        const desigText = getFd('Designation');
        const deptText = getFd('Department');
        const onwardText = getFd('from'); // matches visit_dates_from
        const returnText = getFd('to');   // matches visit_dates_to
        const placeText = getFd('place');
        const purposeText = getFd('purpose');
        const sectorsText = getFd('sectors');
        const reasonsText = getFd('reason_for_travel');
        const mhrdObj = getFd('mhrd');
        const mhrdText = typeof mhrdObj === 'boolean' ? (mhrdObj ? 'Yes' : 'No') : String(mhrdObj || '');
        const budgetText = getFd('budget');

        // Coordinates mapping translated precisely against layout schema (17.28 points)
        draw(nameText, 310, 172);
        draw(desigText, 310, 198);
        draw(deptText, 310, 218);
        draw(onwardText, 320, 262, 10);
        draw(returnText, 435, 262, 10);
        draw(placeText, 310, 287);
        draw(purposeText, 310, 309);
        draw(String(sectorsText).substring(0, 50), 310, 338);
        draw(String(reasonsText).substring(0, 50), 310, 392);
        draw(mhrdText, 435, 432);
        draw(String(budgetText).substring(0, 50), 310, 475);

        // Helper for embedding signatures dynamically
        const embedSig = async (sigUrl: string | undefined | null, targetY: number, targetX: number = 350) => {
            if (!sigUrl || typeof sigUrl !== 'string' || !sigUrl.includes('/uploads/')) return;
            try {
                const cleanUrl = sigUrl.split('?')[0].replace(/^\/+/, '');
                const sigPath = path.join(__dirname, '../../', cleanUrl);

                if (fs.existsSync(sigPath)) {
                    const sigImageBytes = fs.readFileSync(sigPath);
                    let sigImage;

                    if (sigPath.toLowerCase().endsWith('.png')) {
                        sigImage = await pdfDoc.embedPng(sigImageBytes);
                    } else if (sigPath.toLowerCase().match(/\.jpe?g$/)) {
                        sigImage = await pdfDoc.embedJpg(sigImageBytes);
                    }

                    if (sigImage) {
                        p.drawImage(sigImage, {
                            x: targetX,
                            y: height - targetY,
                            width: 100, // max width
                            height: 38, // max height
                        });
                        const dateStr = form.updated_at ? new Date(form.updated_at).toLocaleDateString() : new Date().toLocaleDateString();
                        draw(dateStr, targetX + 20, targetY + 5, 9); // Add date beneath signature
                    }
                }
            } catch (e) {
                console.error("Signature embed failed:", e);
            }
        };

        const applicantSig = getFd('applicant') || form.users?.signature_url;
        await embedSig(applicantSig, 578, 350);

        // Process advanced approvals
        if (form.form_approvals && Array.isArray(form.form_approvals)) {
            const getStageSig = (stageStart: string) => {
                const app = form.form_approvals.find((a: any) => a.stage && a.stage.toLowerCase().includes(stageStart) && a.decision === 'APPROVED');
                if (!app || !app.approval_data) return null;
                const ad = app.approval_data as any;
                for (const key of Object.keys(ad)) {
                    if (typeof ad[key] === 'string' && ad[key].includes('/uploads/')) return ad[key];
                }
                return null;
            };

            await embedSig(getStageSig('hod') || getStageSig('recommendation'), 630, 200);
            await embedSig(getStageSig('dean'), 670, 80);
            await embedSig(getStageSig('director'), 730, 80);
        }

        const outBytes = await pdfDoc.save();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Application_${form.id}.pdf"`);
        res.send(Buffer.from(outBytes));

    } catch (error) {
        console.error('Download PDF error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
