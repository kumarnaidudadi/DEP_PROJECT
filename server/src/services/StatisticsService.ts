// ─── StatisticsService ────────────────────────────────────────────────────────
// Computes aggregated statistics from existing DB tables.
// Supports: date range, single date, time range, user filter, IP filter.
// No business logic duplication — reads from the same tables as FormService.

import { PrismaClient } from '@prisma/client';

export class StatisticsService {
    constructor(private readonly prisma: PrismaClient) {}

    // ── Helpers ───────────────────────────────────────────────────────────

    private buildDateRange(
        dateFrom?: string,
        dateTo?: string,
        singleDate?: string,
        timeFrom?: string,
        timeTo?: string,
    ): { gte?: Date; lte?: Date } | undefined {
        if (singleDate) {
            const base = new Date(singleDate);
            // Apply optional time range within the single date
            const [hFrom = 0, mFrom = 0] = timeFrom ? timeFrom.split(':').map(Number) : [0, 0];
            const [hTo = 23, mTo = 59] = timeTo ? timeTo.split(':').map(Number) : [23, 59];
            const gte = new Date(base);
            gte.setHours(hFrom, mFrom, 0, 0);
            const lte = new Date(base);
            lte.setHours(hTo, mTo, 59, 999);
            return { gte, lte };
        }

        const range: { gte?: Date; lte?: Date } = {};
        if (dateFrom) {
            const d = new Date(dateFrom);
            if (timeFrom) {
                const [h, m] = timeFrom.split(':').map(Number);
                d.setHours(h, m, 0, 0);
            } else {
                d.setHours(0, 0, 0, 0);
            }
            range.gte = d;
        }
        if (dateTo) {
            const d = new Date(dateTo);
            if (timeTo) {
                const [h, m] = timeTo.split(':').map(Number);
                d.setHours(h, m, 59, 999);
            } else {
                d.setHours(23, 59, 59, 999);
            }
            range.lte = d;
        }
        return Object.keys(range).length > 0 ? range : undefined;
    }

    // ── General / Date Range Statistics ──────────────────────────────────

    async getGeneralStats(params: {
        dateFrom?: string;
        dateTo?: string;
        singleDate?: string;
        timeFrom?: string;
        timeTo?: string;
    }): Promise<any> {
        const dateRange = this.buildDateRange(
            params.dateFrom, params.dateTo, params.singleDate,
            params.timeFrom, params.timeTo,
        );

        const submittedWhere: any = {};
        const historyWhere: any = {};

        if (dateRange) {
            submittedWhere.submitted_at = dateRange;
            historyWhere.created_at = dateRange;
        }

        // Application counts
        const [totalSubmitted, totalApproved, totalRejected, totalForwarded] = await Promise.all([
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: { not: 'draft' } } }),
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: 'approved' } }),
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: { in: ['rejected', 'returned'] } } }),
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: 'forwarded' } }),
        ]);

        // User stats — from user_activity_logs
        const userCreatedWhere: any = {};
        if (dateRange) userCreatedWhere.created_at = dateRange;

        const totalNewUsers = await this.prisma.users.count({
            where: dateRange ? { created_at: dateRange } : {},
        });

        // Logins: count unique login events from form_history with action='login'
        // Since there is no dedicated login log table, we count from user_activity_logs 'activated' events
        // and approximate logins via form_history distinct users per date range.
        // More accurately: count distinct users who have a form_history entry in the date range.
        const loginHistoryWhere: any = { ...historyWhere };
        const distinctLoggedIn = await this.prisma.form_history.findMany({
            where: loginHistoryWhere,
            select: { changed_by: true },
            distinct: ['changed_by'],
        });
        const totalLoggedIn = distinctLoggedIn.filter(r => r.changed_by !== null).length;

        // Peak activity hour — group history entries by hour
        const allHistory = await this.prisma.form_history.findMany({
            where: historyWhere,
            select: { created_at: true },
            orderBy: { created_at: 'asc' },
        });

        const hourCounts: Record<number, number> = {};
        for (const h of allHistory) {
            if (!h.created_at) continue;
            const hour = new Date(h.created_at).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
        let peakHour: number | null = null;
        let peakCount = 0;
        for (const [h, cnt] of Object.entries(hourCounts)) {
            if (cnt > peakCount) { peakCount = cnt; peakHour = Number(h); }
        }

        // Daily activity breakdown
        const dailyMap: Record<string, number> = {};
        for (const h of allHistory) {
            if (!h.created_at) continue;
            const day = new Date(h.created_at).toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] || 0) + 1;
        }
        const dailyBreakdown = Object.entries(dailyMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Status breakdown
        const statusGroups = await this.prisma.applied_forms.groupBy({
            by: ['status'],
            where: submittedWhere,
            _count: { id: true },
        });
        const statusBreakdown = statusGroups.map((g: any) => ({
            status: g.status || 'unknown',
            count: g._count.id,
        }));

        return {
            totalSubmitted,
            totalApproved,
            totalRejected,
            totalForwarded,
            totalNewUsers,
            totalLoggedIn,
            peakHour,
            peakCount,
            dailyBreakdown,
            statusBreakdown,
        };
    }

    // ── User-Specific Statistics ──────────────────────────────────────────

    async getUserStats(params: {
        userId: number;
        dateFrom?: string;
        dateTo?: string;
        singleDate?: string;
        timeFrom?: string;
        timeTo?: string;
    }): Promise<any> {
        const dateRange = this.buildDateRange(
            params.dateFrom, params.dateTo, params.singleDate,
            params.timeFrom, params.timeTo,
        );

        const uid = Number(params.userId);

        const submittedWhere: any = { applicant_id: uid };
        const historyWhere: any = { changed_by: uid };
        const forwardWhere: any = { forwarded_by: uid };

        if (dateRange) {
            submittedWhere.submitted_at = dateRange;
            historyWhere.created_at = dateRange;
            forwardWhere.forwarded_at = dateRange;
        }

        // User profile
        const user = await this.prisma.users.findUnique({
            where: { id: uid },
            select: {
                id: true, first_name: true, last_name: true, email: true,
                created_at: true, is_active: true,
                user_roles: { include: { roles: { select: { name: true } } } },
            },
        });
        if (!user) throw new Error('USER_NOT_FOUND');

        const [submitted, approved, rejected, forwarded] = await Promise.all([
            this.prisma.applied_forms.count({ where: submittedWhere }),
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: 'approved' } }),
            this.prisma.applied_forms.count({ where: { ...submittedWhere, status: { in: ['rejected', 'returned'] } } }),
            this.prisma.form_forwards.count({ where: forwardWhere }),
        ]);

        // Activity timeline (last 50 entries)
        const timeline = await this.prisma.form_history.findMany({
            where: historyWhere,
            orderBy: { created_at: 'desc' },
            take: 50,
            include: {
                applied_forms: {
                    select: { reference_number: true, status: true, form_types: { select: { name: true } } },
                },
            },
        });

        // Last seen: most recent history entry
        const lastActivity = timeline[0]?.created_at ?? null;

        // Group timeline by action type
        const actionGroups: Record<string, number> = {};
        for (const t of timeline) {
            const action = t.action || 'unknown';
            actionGroups[action] = (actionGroups[action] || 0) + 1;
        }

        return {
            user: {
                id: user.id,
                name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
                email: user.email,
                roles: user.user_roles.map((ur: any) => ur.roles?.name).filter(Boolean),
                joinedAt: user.created_at,
                isActive: user.is_active,
            },
            submitted,
            approved,
            rejected,
            forwarded,
            lastActivity,
            timeline: timeline.map((t: any) => ({
                action: t.action,
                date: t.created_at,
                formRef: t.applied_forms?.reference_number || null,
                formType: t.applied_forms?.form_types?.name || null,
                formStatus: t.applied_forms?.status || null,
            })),
            actionGroups: Object.entries(actionGroups).map(([action, count]) => ({ action, count })),
        };
    }

    // ── IP Address Statistics ─────────────────────────────────────────────

    async getIpStats(params: {
        ipAddress: string;
        dateFrom?: string;
        dateTo?: string;
        singleDate?: string;
        timeFrom?: string;
        timeTo?: string;
    }): Promise<any> {
        const dateRange = this.buildDateRange(
            params.dateFrom, params.dateTo, params.singleDate,
            params.timeFrom, params.timeTo,
        );

        const ip = params.ipAddress.trim();
        const historyWhere: any = { ip_address: ip };
        if (dateRange) historyWhere.created_at = dateRange;

        // All history from this IP
        const allHistory = await this.prisma.form_history.findMany({
            where: historyWhere,
            orderBy: { created_at: 'asc' },
            include: {
                users: { select: { id: true, first_name: true, last_name: true, email: true } },
                applied_forms: {
                    select: { reference_number: true, form_types: { select: { name: true } } },
                },
            },
        });

        const totalActions = allHistory.length;
        const firstSeen = allHistory[0]?.created_at ?? null;
        const lastSeen = allHistory[allHistory.length - 1]?.created_at ?? null;

        // Distinct users who acted from this IP
        const userMap: Record<number, any> = {};
        for (const h of allHistory) {
            if (h.users && h.changed_by) {
                userMap[h.changed_by] = h.users;
            }
        }
        const distinctUsers = Object.values(userMap);

        // Successful logins: form_history entries with action='submitted' from this IP as a proxy
        // (exact login tracking would need a dedicated table; we use actions count as proxy)
        const successfulActions = allHistory.filter(h => h.action === 'submitted').length;
        const forwardedActions = allHistory.filter(h => h.action === 'forwarded').length;
        const approvedActions = allHistory.filter(h => h.action === 'approved').length;
        const rejectedActions = allHistory.filter(h => h.action === 'rejected').length;

        // Daily breakdown
        const dailyMap: Record<string, number> = {};
        for (const h of allHistory) {
            if (!h.created_at) continue;
            const day = new Date(h.created_at).toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] || 0) + 1;
        }
        const dailyBreakdown = Object.entries(dailyMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const multipleUsers = distinctUsers.length > 1;
        // Security flag: if multiple users from same IP — potential shared/suspicious
        const securityWarning = multipleUsers;

        return {
            ipAddress: ip,
            totalActions,
            successfulActions,
            forwardedActions,
            approvedActions,
            rejectedActions,
            firstSeen,
            lastSeen,
            distinctUsers: distinctUsers.map((u: any) => ({
                id: u.id,
                name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
                email: u.email,
            })),
            multipleUsers,
            securityWarning,
            dailyBreakdown,
            recentActions: allHistory.slice(-20).reverse().map((h: any) => ({
                action: h.action,
                date: h.created_at,
                user: h.users ? [h.users.first_name, h.users.last_name].filter(Boolean).join(' ') || h.users.email : 'Unknown',
                formRef: h.applied_forms?.reference_number || null,
                formType: h.applied_forms?.form_types?.name || null,
            })),
        };
    }

    // ── Users list for filter dropdown ───────────────────────────────────

    async getAllUsersForFilter(): Promise<any[]> {
        const users = await this.prisma.users.findMany({
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                user_roles: { include: { roles: { select: { name: true } } } },
            },
            orderBy: { first_name: 'asc' },
            take: 500,
        });
        return users.map((u: any) => ({
            id: u.id,
            name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
            email: u.email,
            roles: u.user_roles.map((ur: any) => ur.roles?.name).filter(Boolean),
        }));
    }
}
