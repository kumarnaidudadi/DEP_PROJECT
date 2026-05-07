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

        const department_id_raw = data.department_id !== '' && data.department_id != null ? data.department_id : null;
        if (department_id_raw !== null && isNaN(Number(department_id_raw))) {
            throw new Error(`Invalid Department ID provided: ${department_id_raw}`);
        }
        const department_id = department_id_raw ? Number(department_id_raw) : null;

        const role_id_raw = data.role_id !== '' && data.role_id != null ? data.role_id : null;
        if (role_id_raw !== null && isNaN(Number(role_id_raw))) {
            throw new Error(`Invalid Role ID provided: ${role_id_raw}`);
        }
        const role_id = role_id_raw ? Number(role_id_raw) : null;

        const joining_date = data.joining_date && data.joining_date !== ''
            ? new Date(data.joining_date)
            : null;

        const user = await this.prisma.users.create({
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

        if (role_id) {
            await this.prisma.user_roles.create({
                data: {
                    user_id: user.id,
                    role_id: role_id
                }
            });

            // If a department is selected, also consider adding them to department_heads if they have a HOD role.
            // We check the role name:
            const roleObj = await this.prisma.roles.findUnique({ where: { id: role_id } });
            if (roleObj && (roleObj.name.toUpperCase().includes('HOD') || roleObj.name.toUpperCase().includes('HEAD')) && department_id) {
                // Upsert to department_heads just in case
                await this.prisma.department_heads.create({
                    data: {
                        user_id: user.id,
                        department_id: department_id
                    }
                });
            }
        }

        return user;
    }


    async getInactiveUsers(): Promise<any[]> {
        return this.prisma.users.findMany({
            where: { is_active: false },
            include: {
                department: true,
                user_roles: {
                    include: { roles: true }
                },
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
                department: true,
                user_roles: {
                    include: { roles: true }
                },
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
                let reason = err.message || 'Unknown error';
                
                // Parse formatting or Prisma constraint errors into readable messages
                if (err.code === 'P2003') {
                    if (err.meta?.field_name?.includes('department_id')) {
                        reason = `Invalid Department ID: ${u.department_id} not found in system.`;
                    } else if (err.meta?.field_name?.includes('role_id')) {
                        reason = `Invalid Role ID: ${u.role_id} not found in system.`;
                    } else {
                        reason = 'Invalid reference (e.g. invalid role or department ID).';
                    }
                } else if (err.code === 'P2002') {
                    reason = 'Duplicate entry found for unique field (e.g. Employee ID or Email).';
                }

                failed.push({ row: u, reason });
            }
        }
        return { added, failed };
    }
}
