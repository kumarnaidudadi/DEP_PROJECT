// ─── UserRepository ───────────────────────────────────────────────────────────
// Concrete Prisma implementation of IUserRepository.
// Single Responsibility: purely responsible for user data persistence.
// Schema: users has: id (BigInt), name, email, password, department_id, created_at, updated_at

import { PrismaClient } from '@prisma/client';
import { IUserRepository } from './IUserRepository';

export class UserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findByEmail(email: string): Promise<any | null> {
        return this.prisma.users.findUnique({
            where: { email },
            include: { user_roles: { include: { roles: true } } },
        });
    }

    async findById(id: number): Promise<any | null> {
        return this.prisma.users.findUnique({
            where: { id: BigInt(id) },
            include: { user_roles: { include: { roles: true } } },
        });
    }

    async create(data: object): Promise<any> {
        return this.prisma.users.create({ data: data as any });
    }

    async updateOtp(email: string, otp: string | null, expiry: Date | null): Promise<void> {
        // No otp columns in actual DB — this is a no-op placeholder
        // OTP support requires adding otp_code/otp_expiry columns to the users table
        console.warn('[UserRepository] updateOtp called but DB has no OTP columns');
    }

    async findDefaultRole(): Promise<any | null> {
        return this.prisma.roles.findFirst({
            where: { name: { equals: 'APPLICANT', mode: 'insensitive' } },
        });
    }

    async assignRole(userId: number, roleId: number): Promise<void> {
        await this.prisma.user_roles.create({
            data: { user_id: BigInt(userId), role_id: BigInt(roleId) },
        });
    }
}
