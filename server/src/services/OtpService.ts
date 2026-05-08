import { PrismaClient } from '@prisma/client';
import { ActivityLogService } from './ActivityLogService';
import { AccountNotificationService } from './AccountNotificationService';
import nodemailer from 'nodemailer';

export class OtpService {
    private accountNotifier = new AccountNotificationService();

    constructor(private prisma: PrismaClient, private activityLogService: ActivityLogService) {}

    async sendOtp(email: string): Promise<void> {
        const user = await this.prisma.users.findUnique({ where: { email } });
        if (!user) throw new Error('ACCESS_DENIED');

        if (!user.is_active) {
            throw new Error('ACCOUNT_INACTIVE');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await this.prisma.users.update({
            where: { email },
            data: { otp_code: otp, otp_expiry: expiry }
        });

        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        console.log(`[OtpService] Attempting to send OTP to ${email}`);
        console.log(`[OtpService] EMAIL_USER configured: ${emailUser ? 'YES (' + emailUser + ')' : 'NO - EMAIL_USER not set!'}`);
        console.log(`[OtpService] EMAIL_PASS configured: ${emailPass ? 'YES (length=' + emailPass.length + ')' : 'NO - EMAIL_PASS not set!'}`);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // SSL
            auth: { user: emailUser, pass: emailPass },
            tls: { rejectUnauthorized: false },
        });

        try {
            const info = await transporter.sendMail({
                from: `"DEP Portal" <${emailUser}>`,
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
            console.log(`[OtpService] ✅ OTP email sent successfully to ${email}. MessageId: ${info.messageId}`);
        } catch (error: any) {
            console.error(`[OtpService] ❌ SMTP send failed: ${error.message}`);
            console.error(`[OtpService] Error code: ${error.code}, Response: ${error.response}`);
            // CRITICAL FALLBACK: Always log OTP so admin can manually relay it if email fails
            console.log(`[OtpService] ⚠️ FALLBACK - OTP for ${email} is: ${otp} (expires in 5 minutes)`);
        }
    }

    async verifyOtp(email: string, otp: string): Promise<{ success: boolean; shouldWarn?: boolean; deactivated?: boolean; message?: string; user?: any }> {
        const user = await this.prisma.users.findUnique({ where: { email } });
        if (!user) throw new Error('USER_NOT_FOUND');

        if (!user.is_active) {
            return { success: false, deactivated: true, message: 'Account is inactive' };
        }

        if (!user.otp_code) throw new Error('NO_OTP_REQUESTED');
        if (user.otp_expiry && new Date() > new Date(user.otp_expiry)) throw new Error('OTP_EXPIRED');

        if (user.otp_code !== otp) {
            // failed attempt
            const newAttempts = (user.otp_attempts || 0) + 1;
            
            if (newAttempts >= 3) {
                // Deactivate
                await this.prisma.users.update({
                    where: { id: user.id },
                    data: { is_active: false, otp_attempts: newAttempts }
                });
                await this.activityLogService.logAction(user.id, 'Exceeded OTP attempts (3 failed)', 'deactivated', 'system');

                // Notify user by email (fire-and-forget)
                this.accountNotifier.sendAccountBlockedEmail({
                    email: user.email,
                    firstName: user.first_name || 'User',
                    reason: '3 consecutive failed OTP login attempts detected.',
                    triggeredBy: 'system',
                    timestamp: new Date(),
                });

                return { success: false, deactivated: true, message: 'Your account has been blocked due to excessive failed OTP attempts. Please contact the administrator.' };
            } else {
                // Update attempts
                await this.prisma.users.update({
                    where: { id: user.id },
                    data: { otp_attempts: newAttempts }
                });
                if (newAttempts === 2) {
                    return { success: false, shouldWarn: true, message: 'Warning: You have 1 attempt remaining before your account is deactivated.' };
                }
                return { success: false, message: 'Invalid OTP' };
            }
        }

        // Success - DO NOT clear OTP here. Let AuthService handle the final clearing so it can issue JWT.
        // We do reset the attempts here though.
        await this.prisma.users.update({
            where: { id: user.id },
            data: { otp_attempts: 0 }
        });

        return { success: true, user };
    }
}
