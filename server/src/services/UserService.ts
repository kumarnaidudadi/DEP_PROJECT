import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ActivityLogService } from './ActivityLogService';
import { AccountNotificationService } from './AccountNotificationService';

export class UserService {
    private accountNotifier = new AccountNotificationService();

    constructor(private prisma: PrismaClient, private activityLogService: ActivityLogService) {}

    async createUser(data: any): Promise<any> {
        // Only require password hash if auth_provider is not oauth
        let password = data.password;
        if (password) {
            password = await bcrypt.hash(password, 10);
        } else {
            // Give a random uncrackable password for users added without password (e.g., Google auth)
            password = await bcrypt.hash(Math.random().toString(36), 10);
        }

        // Sanitize optional typed fields — empty strings must become null
        const department_id = data.department_id !== '' && data.department_id != null
            ? Number(data.department_id)
            : null;

        const joining_date = data.joining_date && data.joining_date !== ''
            ? new Date(data.joining_date)
            : null;

        return this.prisma.users.create({
            data: {
                first_name: data.first_name || null,
                middle_name: data.middle_name || null,
                last_name: data.last_name || null,
                email: data.email,
                password,
                emp_code: data.emp_code || null,
                department_id,
                joining_date,
                auth_provider: data.auth_provider || 'local',
                signature_url: data.signature_url || null,
                is_active: true
            }
        });
    }


    async getInactiveUsers(): Promise<any[]> {
        return this.prisma.users.findMany({
            where: { is_active: false },
            include: {
                user_activity_logs: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            }
        });
    }

    async getAllUsers(): Promise<any[]> {
        return this.prisma.users.findMany({
            include: {
                user_activity_logs: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            },
            orderBy: { first_name: 'asc' }
        });
    }

    async toggleUserStatus(userId: number, isActive: boolean, adminId: number, reason: string): Promise<any> {
        const user = await this.prisma.users.findUnique({ where: { id: userId } });
        if (!user) throw new Error('USER_NOT_FOUND');

        const updatedUser = await this.prisma.users.update({
            where: { id: userId },
            data: { 
                is_active: isActive, 
                otp_attempts: isActive ? 0 : undefined 
            }
        });

        await this.activityLogService.logAction(
            userId,
            reason,
            isActive ? 'activated' : 'deactivated',
            'admin'
        );

        // Send notification email (fire-and-forget — non-blocking)
        const firstName = user.first_name || 'User';
        const email = user.email;
        const timestamp = new Date();

        if (isActive) {
            this.accountNotifier.sendAccountActivatedEmail({ email, firstName, reason, triggeredBy: 'admin', timestamp });
        } else {
            this.accountNotifier.sendAccountBlockedEmail({ email, firstName, reason, triggeredBy: 'admin', timestamp });
        }

        return updatedUser;
    }

    async bulkCreate(users: any[]): Promise<{ added: number, failed: any[] }> {
        let added = 0;
        const failed: any[] = [];
        
        for (const u of users) {
            try {
                if (!u.email) {
                    failed.push({ row: u, reason: 'Missing email' });
                    continue;
                }
                const existing = await this.prisma.users.findUnique({ where: { email: u.email } });
                if (existing) {
                    failed.push({ row: u, reason: 'Email already exists' });
                    continue;
                }
                await this.createUser(u);
                added++;
            } catch (err: any) {
                failed.push({ row: u, reason: err.message });
            }
        }
        return { added, failed };
    }
}
