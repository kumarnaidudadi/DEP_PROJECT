// ─── FormRepository ───────────────────────────────────────────────────────────
// Concrete Prisma implementation of IFormRepository.
// This is the ONLY place in the server that interacts with the DB for forms.
// Tables: applied_forms, form_types, form_forwards, form_history, office_orders

import { PrismaClient } from '@prisma/client';
import { IFormRepository } from './IFormRepository';
import { CreateFormDto } from '../dtos/FormDto';

export class FormRepository implements IFormRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // ── Forms (applied_forms table) ──────────────────────────────────────

    async findById(id: number): Promise<any | null> {
        return this.prisma.applied_forms.findUnique({
            where: { id: BigInt(id) },
            include: {
                form_types: true,
                users: { select: { id: true, first_name: true, last_name: true, email: true, department_id: true } },
                form_forwards: {
                    include: {
                        from_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                        to_user: { select: { id: true, first_name: true, last_name: true, email: true } }
                    },
                    orderBy: { forwarded_at: 'asc' }
                },
                form_history: {
                    include: { users: { select: { id: true, first_name: true, last_name: true, email: true } } },
                    orderBy: { created_at: 'desc' }
                },
                office_orders: true
            }
        });
    }

    async findAll(whereClause: object): Promise<any[]> {
        return this.prisma.applied_forms.findMany({
            where: whereClause,
            include: {
                form_types: true,
                users: {
                    select: { id: true, first_name: true, last_name: true, email: true, department_id: true }
                },
                form_forwards: {
                    orderBy: { forwarded_at: 'desc' },
                    take: 1,
                    include: {
                        to_user: { select: { id: true, first_name: true, last_name: true } }
                    }
                },
                form_history: {
                    orderBy: { created_at: 'desc' },
                    take: 3,
                    include: { users: { select: { id: true, first_name: true, last_name: true } } }
                },
                office_orders: true
            },
            orderBy: { updated_at: 'desc' },
        });
    }

    async create(dto: CreateFormDto): Promise<any> {
        return this.prisma.applied_forms.create({
            data: {
                form_type_id: BigInt(dto.form_type_id),
                applicant_id: BigInt(dto.userId),
                form_data: dto.form_data as any,
                status: 'submitted',
                submitted_at: new Date(),
            },
        });
    }

    async saveDraft(dto: CreateFormDto, id?: number): Promise<any> {
        if (id) {
            return this.prisma.applied_forms.update({
                where: { id: BigInt(id) },
                data: {
                    form_data: dto.form_data as any,
                    updated_at: new Date(),
                },
            });
        }
        return this.prisma.applied_forms.create({
            data: {
                form_type_id: BigInt(dto.form_type_id),
                applicant_id: BigInt(dto.userId),
                form_data: dto.form_data as any,
                status: 'draft',
            },
        });
    }

    async delete(id: number): Promise<void> {
        await this.prisma.applied_forms.delete({ where: { id: BigInt(id) } });
    }

    async updateStatus(id: number, status: string, extra?: object): Promise<any> {
        return this.prisma.applied_forms.update({
            where: { id: BigInt(id) },
            data: { status, updated_at: new Date(), ...extra },
        });
    }

    async updateFormData(id: number, formData: object): Promise<any> {
        return this.prisma.applied_forms.update({
            where: { id: BigInt(id) },
            data: { form_data: formData as any },
        });
    }

    // ── Form Forwards ──────────────────────────────────────────────────────

    async createForward(data: object): Promise<any> {
        return this.prisma.form_forwards.create({ data: data as any });
    }

    async findForwardsByForm(formId: number): Promise<any[]> {
        return this.prisma.form_forwards.findMany({
            where: { form_id: BigInt(formId) },
            include: {
                from_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                to_user: { select: { id: true, first_name: true, last_name: true, email: true } }
            },
            orderBy: { forwarded_at: 'asc' },
        });
    }

    async findLatestForward(formId: number): Promise<any | null> {
        return this.prisma.form_forwards.findFirst({
            where: { form_id: BigInt(formId) },
            include: {
                from_user: { select: { id: true, first_name: true, last_name: true } },
                to_user: { select: { id: true, first_name: true, last_name: true } }
            },
            orderBy: { forwarded_at: 'desc' },
        });
    }

    // ── Form Types ─────────────────────────────────────────────────────────

    async findFormTypeById(id: number): Promise<any | null> {
        return this.prisma.form_types.findUnique({
            where: { id: BigInt(id) },
        });
    }

    async findAllFormTypes(where: any = {}): Promise<any[]> {
        return this.prisma.form_types.findMany({
            where,
            orderBy: { name: 'asc' }
        });
    }

    async createFormType(data: object): Promise<any> {
        return this.prisma.form_types.create({ data: data as any });
    }

    async updateFormType(id: number, data: object): Promise<any> {
        return this.prisma.form_types.update({ where: { id: BigInt(id) }, data: data as any });
    }

    async deleteFormType(id: number): Promise<void> {
        await this.prisma.form_types.delete({ where: { id: BigInt(id) } });
    }

    // ── Office Orders ──────────────────────────────────────────────────────

    async findOfficeOrder(formId: number): Promise<any | null> {
        return this.prisma.office_orders.findFirst({ where: { applied_form_id: BigInt(formId) } });
    }

    async createOfficeOrder(data: object): Promise<any> {
        return this.prisma.office_orders.create({ data: data as any });
    }

    // ── Roles ──────────────────────────────────────────────────────────────

    async findRoleByName(name: string): Promise<any | null> {
        return this.prisma.roles.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    }

    // ── Users (for search & lookup) ───────────────────────────────────────

    async searchUsers(query: string, limit: number = 10): Promise<any[]> {
        return this.prisma.users.findMany({
            where: {
                OR: [
                    { first_name: { contains: query, mode: 'insensitive' } },
                    { last_name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                department_id: true,
                user_roles: {
                    include: { roles: { select: { name: true } } }
                }
            },
            take: limit,
            orderBy: { first_name: 'asc' },
        });
    }

    async findUserById(id: number): Promise<any | null> {
        return this.prisma.users.findUnique({
            where: { id: BigInt(id) },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                department_id: true,
                user_roles: {
                    include: { roles: { select: { name: true } } }
                }
            }
        });
    }

    async getUserRoles(userId: number): Promise<string[]> {
        const userRoles = await this.prisma.user_roles.findMany({
            where: { user_id: BigInt(userId) },
            include: { roles: { select: { name: true } } }
        });
        return userRoles.map((ur: any) => ur.roles?.name).filter(Boolean);
    }

    // ── History (form_history table) ──────────────────────────────────────

    async createStatusHistory(data: object): Promise<any> {
        return this.prisma.form_history.create({ data: data as any });
    }

    // ── Transactions ───────────────────────────────────────────────────────

    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
