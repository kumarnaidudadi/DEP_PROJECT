import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from './ActivityLogService';

export class ReactivationService {
    constructor(private prisma: PrismaClient, private activityLogService: ActivityLogService) {}

    /**
     * Submit a request for reactivation (used when inactive user attempts login).
     */
    async submitRequest(userId: number, reason: string): Promise<any> {
        // Prevent duplicate pending requests
        const existing = await this.prisma.reactivation_requests.findFirst({
            where: { user_id: userId, status: 'pending' }
        });
        if (existing) {
            throw new Error('A reactivation request is already pending.');
        }

        return this.prisma.reactivation_requests.create({
            data: {
                user_id: userId,
                reason,
                status: 'pending'
            }
        });
    }

    /**
     * Get all pending reactivation requests for admin view.
     */
    async getPendingRequests(): Promise<any[]> {
        return this.prisma.reactivation_requests.findMany({
            where: { status: 'pending' },
            include: {
                users: {
                    select: { first_name: true, middle_name: true, last_name: true, email: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Approve or reject a reactivation request.
     */
    async processRequest(requestId: number, status: 'approved' | 'rejected', adminId: number, adminNote?: string): Promise<any> {
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.reactivation_requests.update({
                where: { id: requestId },
                data: {
                    status,
                    admin_note: adminNote,
                    reviewed_at: new Date(),
                    reviewed_by: adminId
                }
            });

            if (status === 'approved' && request.user_id) {
                await tx.users.update({
                    where: { id: request.user_id },
                    data: { is_active: true, otp_attempts: 0 } // Reset attempts upon manual activation
                });

                // Use the shared activity logger (but executed inside this transaction ideally. 
                // Since our logAction is outside tx context, we duplicate the insert here to keep it atomic)
                await tx.user_activity_logs.create({
                    data: {
                        user_id: request.user_id,
                        reason: 'Reactivation approved by admin',
                        action: 'activated',
                        triggered_by: 'admin'
                    }
                });
            }

            return request;
        });
    }
}
