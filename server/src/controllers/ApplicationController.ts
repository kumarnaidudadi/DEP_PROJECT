import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// ─── CREATE APPLICATION ──────────────────────────────────────────────
export async function createApplication(req: AuthenticatedRequest, res: Response) {
    try {
        let { form_type_id, form_data } = req.body;
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!form_data) return res.status(400).json({ error: 'Missing form data' });

        // ─── Auto-Resolve Form Type ─────────────────────────────────────
        // Fix for 500 Error: If form_type_id is 1 (hardcoded) but doesn't exist,
        // or if we want to map 'Casual Leave' to a DB entry.

        const leaveType = form_data.leave_type || 'General Application';

        // Try to find existing form type by name
        let formType = await prisma.form_types.findFirst({
            where: { name: { equals: leaveType, mode: 'insensitive' } }
        });

        if (!formType) {
            console.log(`[AppController] Form type '${leaveType}' not found. Creating it...`);
            formType = await prisma.form_types.create({
                data: {
                    name: leaveType,
                    description: `Auto-generated for ${leaveType}`,
                    schema_definition: {}
                }
            });
        }

        form_type_id = formType.id;

        // Auto-assign to Department Head (Mock logic: assign to first user with APPROVER role in same dept)
        // In real app, look up department_heads table. For now, we'll leave it unassigned or assign to specific ID if needed.
        // Actually, let's just create it. The workflow engine or manual assignment can handle next steps.

        const application = await prisma.forms.create({
            data: {
                form_type_id: Number(form_type_id),
                submitted_by: userId,
                form_data: form_data,
                current_status: 'SUBMITTED', // Default status from enum
                submitted_at: new Date(),
            },
        });

        // Initialize approval entry
        await prisma.form_approvals.create({
            data: {
                form_id: application.id,
                stage: 'CO_REVIEW', // First stage
                decision: 'PENDING',
            }
        });

        res.status(201).json(application);
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
        } else if (userRoles.includes('APPROVER')) {
            // Approver sees forms needing approval or previously approved by them
            // Simplified: Approver sees everything for now, or filter by department
            whereClause = {}; // TODO: Filter by department or assignment
        } else {
            // Applicant sees only their own
            whereClause = { submitted_by: userId };
        }

        const applications = await prisma.forms.findMany({
            where: whereClause,
            include: {
                form_types: true,
                users: {
                    select: { first_name: true, last_name: true, email: true }
                },
                form_approvals: {
                    orderBy: { decided_at: 'desc' },
                    take: 1
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
        const signatureFile = req.file; // From Multer

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // 1. Update form status
        const form = await prisma.forms.update({
            where: { id: Number(id) },
            data: {
                current_status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
                updated_at: new Date(),
            },
        });

        // 2. Log approval action
        const approvalData: any = {};
        if (signatureFile) {
            approvalData.signature_url = `/uploads/signatures/${signatureFile.filename}`;
        }

        await prisma.form_approvals.create({
            data: {
                form_id: Number(id),
                stage: 'FINAL_APPROVAL', // Simplified workflow
                approved_by: userId,
                decision: status,
                remarks: remarks || '',
                decided_at: new Date(),
                approval_data: approvalData
            }
        });

        res.json(form);
    } catch (error) {
        console.error('Update Status Error:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
}
