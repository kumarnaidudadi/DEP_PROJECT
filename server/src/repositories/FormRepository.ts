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
            where: { id: Number(id) },
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
                    include: {
                        from_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                        to_user: { select: { id: true, first_name: true, last_name: true, email: true } }
                    },
                    orderBy: { forwarded_at: 'asc' }
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
                form_type_id: Number(dto.form_type_id),
                applicant_id: Number(dto.userId),
                form_data: dto.form_data as any,
                status: 'submitted',
                submitted_at: new Date(),
            },
        });
    }

    async saveDraft(dto: CreateFormDto, id?: number): Promise<any> {
        if (id) {
            return this.prisma.applied_forms.update({
                where: { id: Number(id) },
                data: {
                    form_data: dto.form_data as any,
                    updated_at: new Date(),
                },
            });
        }
        return this.prisma.applied_forms.create({
            data: {
                form_type_id: Number(dto.form_type_id),
                applicant_id: Number(dto.userId),
                form_data: dto.form_data as any,
                status: 'draft',
            },
        });
    }

    async delete(id: number): Promise<void> {
        await this.prisma.applied_forms.delete({ where: { id: Number(id) } });
    }

    async updateStatus(id: number, status: string, extra?: object): Promise<any> {
        return this.prisma.applied_forms.update({
            where: { id: Number(id) },
            data: { status, updated_at: new Date(), ...extra },
        });
    }

    async updateFormData(id: number, formData: object): Promise<any> {
        return this.prisma.applied_forms.update({
            where: { id: Number(id) },
            data: { form_data: formData as any },
        });
    }

    async getNextReferenceNumber(year: number): Promise<number> {
        // Find the max serial already used this year by parsing reference_numbers like XXXX20260000XX
        const yearStr = String(year);
        const results = await this.prisma.applied_forms.findMany({
            where: {
                reference_number: { not: null },
                submitted_at: {
                    gte: new Date(`${year}-01-01T00:00:00.000Z`),
                    lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
                }
            },
            select: { reference_number: true },
        });

        let maxSerial = 0;
        for (const row of results) {
            if (!row.reference_number) continue;
            // Format: PPPP + YYYY + NNNNNN  (4+4+6 = 14 chars)
            if (row.reference_number.length >= 14) {
                const yearPart = row.reference_number.slice(4, 8);
                if (yearPart === yearStr) {
                    const serial = parseInt(row.reference_number.slice(8), 10);
                    if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
                }
            }
        }
        return maxSerial + 1;
    }

    // ── Form Forwards ──────────────────────────────────────────────────────

    async createForward(data: object): Promise<any> {
        return this.prisma.form_forwards.create({ data: data as any });
    }

    async findForwardsByForm(formId: number): Promise<any[]> {
        return this.prisma.form_forwards.findMany({
            where: { form_id: Number(formId) },
            include: {
                from_user: { select: { id: true, first_name: true, last_name: true, email: true } },
                to_user: { select: { id: true, first_name: true, last_name: true, email: true } }
            },
            orderBy: { forwarded_at: 'asc' },
        });
    }

    async findLatestForward(formId: number): Promise<any | null> {
        return this.prisma.form_forwards.findFirst({
            where: { form_id: Number(formId) },
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
            where: { id: Number(id) },
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
        return this.prisma.form_types.update({ where: { id: Number(id) }, data: data as any });
    }

    async findFormTypeByPrefix(prefix: string, excludeId?: number): Promise<any | null> {
        return this.prisma.form_types.findFirst({
            where: {
                ref_prefix: prefix,
                ...(excludeId ? { id: { not: Number(excludeId) } } : {}),
            },
        });
    }

    async deleteFormType(id: number): Promise<void> {
        await this.prisma.form_types.delete({ where: { id: Number(id) } });
    }

    // ── Office Orders ──────────────────────────────────────────────────────

    async findOfficeOrder(formId: number): Promise<any | null> {
        return this.prisma.office_orders.findFirst({ where: { applied_form_id: Number(formId) } });
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

    async findFirstUserByRole(roleName: string, departmentId?: number): Promise<any | null> {
        const whereClause: any = {
            user_roles: {
                some: { roles: { name: roleName } }
            }
        };
        // Specifically for department-bound roles, we restrict by applicant's department
        if (departmentId && roleName === 'HEAD_OF_DEPARTMENT') {
            whereClause.department_id = departmentId;
        }

        return this.prisma.users.findFirst({
            where: whereClause,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                department_id: true,
                user_roles: { include: { roles: { select: { name: true } } } }
            }
        });
    }

    async findUserById(id: number): Promise<any | null> {
        return this.prisma.users.findUnique({
            where: { id: Number(id) },
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
            where: { user_id: Number(userId) },
            include: { roles: { select: { name: true } } }
        });
        return userRoles.map((ur: any) => ur.roles?.name).filter(Boolean);
    }

    // ── History (form_history table) ──────────────────────────────────────

    async createStatusHistory(data: object): Promise<any> {
        return this.prisma.form_history.create({ data: data as any });
    }

    async getSystemLogs(): Promise<any[]> {
        return this.prisma.form_history.findMany({
            include: {
                users: { select: { id: true, first_name: true, last_name: true, email: true } },
                applied_forms: {
                    select: {
                        id: true,
                        form_types: { select: { name: true } },
                    }
                }
            },
            orderBy: { created_at: 'desc' },
            take: 1000 // Limit to last 1000 logs for safety
        });
    }

    // ── Transactions ───────────────────────────────────────────────────────

    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
