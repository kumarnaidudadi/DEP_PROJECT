import { PrismaClient } from '@prisma/client';

import { EmailService } from './EmailService';

export class ActingRoleService {
    constructor(private prisma: PrismaClient, private emailService?: EmailService) {}

    async getSentRequests(userId: number) {
        return this.prisma.acting_role_requests.findMany({
            where: { requester_id: userId },
            include: {
                target_user: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            },
            orderBy: { requested_at: 'desc' }
        });
    }

    async getReceivedRequests(userId: number) {
        return this.prisma.acting_role_requests.findMany({
            where: { target_user_id: userId },
            include: {
                requester: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        department_id: true,
                        user_roles: {
                            include: { roles: true }
                        }
                    }
                }
            },
            orderBy: { requested_at: 'desc' }
        });
    }

    async getActiveActingRoles(userId: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const roles = await this.prisma.acting_role_requests.findMany({
            where: {
                target_user_id: userId,
                status: 'accepted',
                from_date: { lte: new Date() },
                until_date: { gte: today }
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        department_id: true,
                        user_roles: {
                            include: { roles: true }
                        }
                    }
                }
            }
        });

        // Enrich each role with the count of pending applications forwarded to the requester
        const enriched = await Promise.all(roles.map(async (role) => {
            // Mirror the frontend filter: count apps where the LATEST forward is
            // still pointing to the requester and not yet acted upon.
            const forms = await this.prisma.applied_forms.findMany({
                where: {
                    status: { notIn: ['approved', 'rejected', 'APPROVED', 'REJECTED'] }
                },
                select: {
                    id: true,
                    applicant_id: true,
                    form_forwards: {
                        orderBy: { forwarded_at: 'desc' },
                        take: 1,
                        select: { forwarded_to: true, action: true }
                    }
                }
            });
            const pendingCount = forms.filter(f => {
                const latest = f.form_forwards[0];
                return latest &&
                    latest.forwarded_to === role.requester_id &&
                    latest.action === 'forwarded' &&
                    f.applicant_id !== role.requester_id;
            }).length;
            return { ...role, pending_count: pendingCount };
        }));

        return enriched;
    }

    async createRequest(userId: number, data: { targetUserId: number, actingRole: string, fromDate: string, untilDate: string }) {
        // Validation
        if (userId === data.targetUserId) {
            throw new Error('Cannot assign acting role to yourself');
        }

        const existingPending = await this.prisma.acting_role_requests.findFirst({
            where: {
                requester_id: userId,
                status: { in: ['pending', 'accepted'] },
                until_date: { gte: new Date() }
            }
        });

        if (existingPending) {
            throw new Error('You already have a pending or active acting role assignment');
        }

        const request = await this.prisma.acting_role_requests.create({
            data: {
                requester_id: userId,
                target_user_id: data.targetUserId,
                acting_role: data.actingRole,
                from_date: new Date(data.fromDate),
                until_date: new Date(data.untilDate),
                status: 'pending'
            }
        });

        // Send Email Notification to Target User
        if (this.emailService) {
            const requesterUser = await this.prisma.users.findUnique({ where: { id: userId } });
            const targetUser = await this.prisma.users.findUnique({ where: { id: data.targetUserId } });
            if (requesterUser && targetUser && targetUser.email) {
                this.emailService.sendEmailNotification('ACTING_ROLE_REQUESTED', targetUser.email, {
                    requestId: request.id,
                    applicantName: `${requesterUser.first_name} ${requesterUser.last_name}`,
                    formType: 'Acting Role Assignment',
                    status: 'PENDING',
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/profile`,
                    timestamp: new Date(),
                    actingRole: {
                        actingRoleLabel: data.actingRole,
                        fromDate: new Date(data.fromDate),
                        untilDate: new Date(data.untilDate)
                    }
                }).catch(e => console.error('Failed to send email:', e));
            }
        }
        
        return request;
    }

    async cancelRequest(userId: number, requestId: number) {
        const request = await this.prisma.acting_role_requests.findUnique({ where: { id: requestId } });
        if (!request || request.requester_id !== userId) {
            throw new Error('Request not found or unauthorized');
        }

        const updated = await this.prisma.acting_role_requests.update({
            where: { id: requestId },
            data: { status: 'revoked', revoked_at: new Date() }
        });

        // Send revocation/cancel email to Target User
        if (this.emailService) {
            const targetUser = await this.prisma.users.findUnique({ where: { id: request.target_user_id } });
            if (targetUser && targetUser.email) {
                this.emailService.sendEmailNotification('ACTING_ROLE_REJECTED', targetUser.email, {
                    requestId: request.id,
                    applicantName: 'System',
                    formType: 'Acting Role Assignment',
                    status: 'REVOKED',
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/profile`,
                    timestamp: new Date(),
                    actingRole: {
                        actingRoleLabel: request.acting_role,
                        fromDate: request.from_date,
                        untilDate: request.until_date,
                        targetName: 'The requester'
                    }
                }).catch(e => console.error('Failed to send email:', e));
            }
        }
        
        return updated;
    }

    async respondRequest(userId: number, requestId: number, status: 'accepted' | 'rejected') {
        const request = await this.prisma.acting_role_requests.findUnique({ where: { id: requestId } });
        if (!request || request.target_user_id !== userId) {
            throw new Error('Request not found or unauthorized');
        }

        if (request.status !== 'pending') {
            throw new Error(`Cannot respond to a request with status ${request.status}`);
        }

        const updated = await this.prisma.acting_role_requests.update({
            where: { id: requestId },
            data: { status, responded_at: new Date() }
        });

        // Send email to Requester
        if (this.emailService) {
            const requesterUser = await this.prisma.users.findUnique({ where: { id: request.requester_id } });
            const targetUser = await this.prisma.users.findUnique({ where: { id: userId } });
            if (requesterUser && requesterUser.email && targetUser) {
                const eventType = status === 'accepted' ? 'ACTING_ROLE_ACCEPTED' : 'ACTING_ROLE_REJECTED';
                this.emailService.sendEmailNotification(eventType, requesterUser.email, {
                    requestId: request.id,
                    applicantName: `${requesterUser.first_name} ${requesterUser.last_name}`,
                    formType: 'Acting Role Assignment',
                    status: status.toUpperCase(),
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/profile`,
                    timestamp: new Date(),
                    actingRole: {
                        actingRoleLabel: request.acting_role,
                        fromDate: request.from_date,
                        untilDate: request.until_date,
                        targetName: `${targetUser.first_name} ${targetUser.last_name}`
                    }
                }).catch(e => console.error('Failed to send email:', e));
            }
        }
        
        return updated;
    }

    async withdrawRequest(userId: number, requestId: number) {
        const request = await this.prisma.acting_role_requests.findUnique({ where: { id: requestId } });
        if (!request || request.target_user_id !== userId) {
            throw new Error('Request not found or unauthorized');
        }

        if (request.status !== 'accepted') {
            throw new Error('You can only withdraw from an accepted acting role');
        }

        const updated = await this.prisma.acting_role_requests.update({
            where: { id: requestId },
            data: { status: 'revoked', revoked_at: new Date() }
        });

        // Notify requester about withdrawal
        if (this.emailService) {
            const requesterUser = await this.prisma.users.findUnique({ where: { id: request.requester_id } });
            const targetUser = await this.prisma.users.findUnique({ where: { id: userId } });
            if (requesterUser && requesterUser.email && targetUser) {
                this.emailService.sendEmailNotification('ACTING_ROLE_REJECTED', requesterUser.email, {
                    requestId: request.id,
                    applicantName: 'System',
                    formType: 'Acting Role Assignment',
                    status: 'WITHDRAWN',
                    actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/profile`,
                    timestamp: new Date(),
                    actingRole: {
                        actingRoleLabel: request.acting_role,
                        fromDate: request.from_date,
                        untilDate: request.until_date,
                        targetName: `${targetUser.first_name} ${targetUser.last_name}`
                    }
                }).catch(e => console.error('Failed to send email:', e));
            }
        }

        return updated;
    }
}
