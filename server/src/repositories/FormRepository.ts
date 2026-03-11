// ─── FormRepository ───────────────────────────────────────────────────────────
// Concrete Prisma implementation of IFormRepository.
// This is the ONLY place in the server that interacts with the DB for forms.
// Single Responsibility: purely responsible for form data persistence.

import { PrismaClient } from '@prisma/client';
import { IFormRepository } from './IFormRepository';
import { CreateFormDto } from '../dtos/FormDto';

export class FormRepository implements IFormRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // ── Forms ──────────────────────────────────────────────────────────────

    async findById(id: number): Promise<any | null> {
        return this.prisma.forms.findUnique({
            where: { id },
            include: {
                form_types: {
                    include: {
                        workflow: {
                            include: { steps: { orderBy: { step_order: 'asc' } } }
                        }
                    }
                },
                users: { select: { first_name: true, last_name: true, email: true } },
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
    }

    async findAll(whereClause: object): Promise<any[]> {
        return this.prisma.forms.findMany({
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
            orderBy: { updated_at: 'desc' },
        });
    }

    async create(dto: CreateFormDto): Promise<any> {
        return this.prisma.forms.create({
            data: {
                form_type_id: dto.form_type_id,
                submitted_by: dto.userId,
                form_data: dto.form_data as any,
                current_status: 'SUBMITTED',
                submitted_at: new Date(),
            },
        });
    }

    async delete(id: number): Promise<void> {
        await this.prisma.forms.delete({ where: { id } });
    }

    async updateStatus(id: number, status: string, extra?: object): Promise<any> {
        return this.prisma.forms.update({
            where: { id },
            data: { current_status: status as any, updated_at: new Date(), ...extra },
        });
    }

    async updateFormData(id: number, formData: object): Promise<any> {
        return this.prisma.forms.update({
            where: { id },
            data: { form_data: formData as any },
        });
    }

    // ── Form Approvals ─────────────────────────────────────────────────────

    async findPendingApproval(formId: number): Promise<any | null> {
        return this.prisma.form_approvals.findFirst({
            where: { form_id: formId, decision: 'PENDING' },
            orderBy: { id: 'desc' },
        });
    }

    async createApproval(data: object): Promise<any> {
        return this.prisma.form_approvals.create({ data: data as any });
    }

    async updateApproval(id: number, data: object): Promise<any> {
        return this.prisma.form_approvals.update({ where: { id }, data: data as any });
    }

    // ── Form Types ─────────────────────────────────────────────────────────

    async findFormTypeById(id: number): Promise<any | null> {
        return this.prisma.form_types.findUnique({ where: { id } });
    }

    async findAllFormTypes(): Promise<any[]> {
        return this.prisma.form_types.findMany({
            where: { is_active: true },
            include: {
                workflow: {
                    include: { steps: { orderBy: { step_order: 'asc' } } }
                }
            }
        });
    }

    async createFormType(data: object): Promise<any> {
        return this.prisma.form_types.create({ data: data as any });
    }

    async updateFormType(id: number, data: object): Promise<any> {
        return this.prisma.form_types.update({ where: { id }, data: data as any });
    }

    async deleteFormType(id: number): Promise<void> {
        await this.prisma.form_types.update({
            where: { id },
            data: { is_active: false }
        });
    }

    // ── Workflows ──────────────────────────────────────────────────────────

    async createWorkflow(data: object): Promise<any> {
        return this.prisma.workflows.create({ data: data as any });
    }

    async updateWorkflow(id: number, data: object): Promise<any> {
        return this.prisma.workflows.update({ where: { id }, data: data as any });
    }

    async deleteWorkflowSteps(workflowId: number): Promise<void> {
        await this.prisma.workflow_steps.deleteMany({ where: { workflow_id: workflowId } });
    }

    async createWorkflowStep(data: object): Promise<any> {
        return this.prisma.workflow_steps.create({ data: data as any });
    }

    // ── Office Orders ──────────────────────────────────────────────────────

    async findOfficeOrder(formId: number): Promise<any | null> {
        return this.prisma.office_orders.findUnique({ where: { form_id: formId } });
    }

    async createOfficeOrder(data: object): Promise<any> {
        return this.prisma.office_orders.create({ data: data as any });
    }

    // ── Department Heads & Roles ───────────────────────────────────────────

    async findDepartmentHead(filter: object): Promise<any | null> {
        return this.prisma.department_heads.findFirst({ where: filter as any });
    }

    async findRoleByName(name: string): Promise<any | null> {
        return this.prisma.roles.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    }

    async findUserRole(roleId: number): Promise<any | null> {
        return this.prisma.user_roles.findFirst({ where: { role_id: roleId } });
    }

    // ── Transactions ───────────────────────────────────────────────────────

    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
