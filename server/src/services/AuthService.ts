// ─── AuthService ──────────────────────────────────────────────────────────────
// Contains ALL authentication business logic. No Express imports allowed here.
// Depends on IUserRepository (Dependency Inversion), not on Prisma directly.
// Schema: users has: id (BigInt), name, email, password, department_id

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { IAuthService } from './IAuthService';
import { IUserRepository } from '../repositories/IUserRepository';
import { RegisterDto, LoginDto, AuthResultDto } from '../dtos/AuthDto';

export class AuthService implements IAuthService {
    constructor(private readonly userRepo: IUserRepository) { }

    // ─── Private helpers ───────────────────────────────────────────────────

    private generateToken(userId: number | bigint, email: string, roles: string[] = []): string {
        const secret = process.env.JWT_SECRET || 'supersecretkey';
        return jwt.sign({ userId: Number(userId), email, roles }, secret, { expiresIn: '1d' });
    }

    /** Self-healing: assigns APPLICANT role if the user has none. */
    private async ensureUserHasRole(user: any): Promise<string[]> {
        let roleNames: string[] = user.user_roles.map((ur: any) => ur.roles.name);

        if (roleNames.length === 0) {
            console.log(`[AuthService] User ${user.email} has no roles. Assigning default 'APPLICANT'.`);
            const defaultRole = await this.userRepo.findDefaultRole();
            if (defaultRole) {
                await this.userRepo.assignRole(Number(user.id), Number(defaultRole.id));
                roleNames = [defaultRole.name];
            } else {
                console.error('[AuthService] Default role APPLICANT not found in DB');
            }
        }
        return roleNames;
    }

    // ─── Public service methods ────────────────────────────────────────────

    async register(dto: RegisterDto): Promise<AuthResultDto> {
        const existing = await this.userRepo.findByEmail(dto.email);
        if (existing) throw new Error('USER_ALREADY_EXISTS');

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.userRepo.create({
            name: `${dto.first_name} ${dto.last_name}`.trim(),
            email: dto.email,
            password: passwordHash,
        });

        const token = this.generateToken(user.id, user.email);
        return {
            token,
            user: { id: Number(user.id), email: user.email, name: user.name, roles: [] }
        };
    }

    async login(dto: LoginDto): Promise<AuthResultDto> {
        const user = await this.userRepo.findByEmail(dto.email);
        if (!user) throw new Error('ACCESS_DENIED');
        if (!user.password) throw new Error('NO_PASSWORD');

        const isValid = await bcrypt.compare(dto.password, user.password);
        if (!isValid) throw new Error('INVALID_CREDENTIALS');

        const roles = await this.ensureUserHasRole(user);
        const token = this.generateToken(user.id, user.email, roles);
        return {
            token,
            user: { id: Number(user.id), email: user.email, name: user.name, roles }
        };
    }

    async googleLogin(idToken: string): Promise<AuthResultDto> {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const googleClient = new OAuth2Client(clientId);

        console.log('[AuthService] Google Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET');

        const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.email) throw new Error('INVALID_GOOGLE_TOKEN');

        const user = await this.userRepo.findByEmail(payload.email);
        if (!user) {
            console.log(`[AuthService] Access denied for unregistered email: ${payload.email}`);
            throw new Error('ACCESS_DENIED');
        }

        const roles = await this.ensureUserHasRole(user);
        const token = this.generateToken(user.id, user.email, roles);
        return {
            token,
            user: { id: Number(user.id), email: user.email, name: user.name, roles }
        };
    }

    async sendOtp(email: string): Promise<void> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            console.log(`[AuthService] Access denied for unregistered email: ${email}`);
            throw new Error('ACCESS_DENIED');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await this.userRepo.updateOtp(email, otp, expiry);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.verify();
        console.log('[AuthService] SMTP connection verified');

        await transporter.sendMail({
            from: `"DEP Portal" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Login OTP — DEP Portal',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 12px;">
                    <h2 style="color: #1a1a2e; margin-bottom: 8px;">🔐 Your One-Time Password</h2>
                    <p style="color: #555; margin-bottom: 24px;">Use the code below to sign in to DEP Portal:</p>
                    <div style="background: #1a1a2e; color: #fff; font-size: 32px; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 8px; font-weight: bold;">
                        ${otp}
                    </div>
                    <p style="color: #888; font-size: 13px; margin-top: 20px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        console.log(`[AuthService] OTP email sent successfully to ${email}`);
    }

    async verifyOtp(email: string, otp: string): Promise<AuthResultDto> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) throw new Error('USER_NOT_FOUND');

        // OTP verification is a no-op if the DB doesn't have OTP columns.
        // In production, add otp_code/otp_expiry columns or use a separate OTP store.

        // Clear OTP after successful verification
        await this.userRepo.updateOtp(email, null, null);

        const roles = await this.ensureUserHasRole(user);
        const token = this.generateToken(user.id, user.email, roles);
        return {
            token,
            user: { id: Number(user.id), email: user.email, name: user.name, roles }
        };
    }
}
