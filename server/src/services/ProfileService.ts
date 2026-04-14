import { IProfileService } from './IProfileService';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './EncryptionService';
import path from 'path';
import fs from 'fs';

export class ProfileService implements IProfileService {
    constructor(private prisma: PrismaClient) {}

    async getProfile(userId: number) {
        const user = await this.prisma.users.findUnique({
            where: { id: Number(userId) },
            include: {
                user_roles: {
                    include: { roles: { select: { name: true } } }
                }
            }
        });

        if (!user) throw new Error('User not found');

        // Fetch department name separately
        let departmentName = null;
        if (user.department_id) {
            const dept = await this.prisma.departments.findUnique({
                where: { id: user.department_id },
                select: { name: true }
            });
            departmentName = dept?.name || null;
        }

        return {
            id: Number(user.id),
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || '',
            email: user.email,
            department_id: user.department_id ? Number(user.department_id) : null,
            display_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || '',
            roles: user.user_roles.map((ur: any) => ur.roles.name),
            department: departmentName,
        };
    }

    async getRoles() {
        return this.prisma.roles.findMany({ select: { name: true } });
    }

    async getDepartments() {
        const depts = await this.prisma.departments.findMany({ select: { id: true, name: true } });
        return depts.map(d => ({ id: Number(d.id), name: d.name }));
    }

    async updateProfile(userId: number, data: { name?: string; first_name?: string; last_name?: string }) {
        // Support both legacy `name` (split into first/last) and direct first_name/last_name
        let updateData: any = { updated_at: new Date() };
        if (data.first_name !== undefined) updateData.first_name = data.first_name;
        if (data.last_name !== undefined) updateData.last_name = data.last_name;
        if (data.name && !data.first_name && !data.last_name) {
            const parts = data.name.trim().split(' ');
            updateData.first_name = parts[0] || '';
            updateData.last_name = parts.slice(1).join(' ') || '';
        }
        const updated = await this.prisma.users.update({
            where: { id: Number(userId) },
            data: updateData,
        });
        const fullName = [updated.first_name, updated.last_name].filter(Boolean).join(' ');
        return { id: Number(updated.id), name: fullName, email: updated.email };
    }

    async uploadSignature(userId: number, fileBuffer: Buffer, fileName: string) {
        const uploadDir = path.join(__dirname, '../../../uploads/signatures');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const ext = path.extname(fileName);
        const finalName = `sig-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const filePath = path.join(uploadDir, finalName);

        const encryptedBuffer = EncryptionService.encrypt(fileBuffer);
        fs.writeFileSync(filePath, encryptedBuffer);

        return `/uploads/signatures/${finalName}`;
    }

    async getSignature(userId: number) {
        const sigDir = path.join(__dirname, '../../../uploads/signatures');
        if (!fs.existsSync(sigDir)) return null;

        const files = fs.readdirSync(sigDir);
        if (files.length === 0) return null;

        const latestFile = files.sort().reverse()[0];
        const sigPath = path.join(sigDir, latestFile);

        const encryptedBytes = fs.readFileSync(sigPath);
        try {
            return EncryptionService.decrypt(encryptedBytes);
        } catch {
            return encryptedBytes;
        }
    }
}
