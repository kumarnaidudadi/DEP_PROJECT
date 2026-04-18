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

    /**
     * Creates a form_history entry AND a corresponding form_comments entry
     * in a single transaction. Returns { history, comment }.
     *
     * commentType: 'general' | 'forward' | 'approval' | 'rejection' | 'return' | 'recall'
     * contentText: plain-text summary that becomes the TipTap doc content.
     */
    async createActionComment(opts: {
        historyData: {
            applied_form_id: number;
            action: string;
            changed_by: number;
            old_data?: object;
            new_data?: object;
            remarks?: string;
        };
        commentType: string;
        contentText: string;
        commentedBy: number;
    }): Promise<{ history: any; comment: any }> {
        const { historyData, commentType, contentText, commentedBy } = opts;

        return this.prisma.$transaction(async (tx) => {
            const history = await tx.form_history.create({ data: historyData as any });

            const comment = await tx.form_comments.create({
                data: {
                    applied_form_id: historyData.applied_form_id,
                    commented_by: commentedBy,
                    form_history_id: history.id,
                    comment_type: commentType,
                    content: {
                        type: 'doc',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: contentText }] }],
                    },
                    is_edited: false,
                    is_deleted: false,
                },
            });

            return { history, comment };
        });
    }

    async getSystemLogs(): Promise<any[]> {
        const forms = await this.prisma.applied_forms.findMany({
            where: { form_history: { some: {} } },
            include: {
                form_types: { select: { name: true } },
                users: { select: { first_name: true, last_name: true, emp_code: true } },
                form_history: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    include: { users: { select: { first_name: true, last_name: true } } }
                },
                _count: {
                    select: { form_history: true, comments: true }
                }
            },
            orderBy: { updated_at: 'desc' },
            take: 1000
        });

        return forms.map((form: any) => ({
            id: form.id,
            reference_number: form.reference_number,
            status: form.status,
            form_type_name: form.form_types?.name || 'Unknown',
            applicant: form.users,
            latest_action: form.form_history[0]?.action || 'Unknown',
            last_actor: form.form_history[0]?.users || null,
            last_updated: form.form_history[0]?.created_at || form.updated_at,
            activity_count: form._count.form_history,
            comment_count: form._count.comments
        }));
    }

    // ── Transactions ───────────────────────────────────────────────────────

    async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
