import { PrismaClient } from '@prisma/client';

export class ActivityLogService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Log a user status change action.
     * @param userId The ID of the user whose status changed.
     * @param reason The reason for the change.
     * @param action 'deactivated' or 'activated'
     * @param triggeredBy 'system' or 'admin'
     */
    async logAction(userId: number, reason: string, action: 'deactivated' | 'activated', triggeredBy: 'system' | 'admin'): Promise<any> {
        return this.prisma.user_activity_logs.create({
            data: {
                user_id: userId,
                reason,
                action,
                triggered_by: triggeredBy
            }
        });
    }

    /**
     * Get activity logs for a specific user.
     * @param userId The user ID to retrieve logs for.
     */
    async getUserLogs(userId: number): Promise<any[]> {
        return this.prisma.user_activity_logs.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });
    }
}
