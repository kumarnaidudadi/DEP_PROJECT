// ─── AccountNotificationService ───────────────────────────────────────────────
// Sends transactional emails when a user account is blocked or reactivated.
// Keeps notification logic fully decoupled from business logic.

import nodemailer from 'nodemailer';

interface AccountEventPayload {
    email: string;
    firstName: string;
    reason: string;
    triggeredBy: 'admin' | 'system';
    timestamp: Date;
}

const PORTAL_NAME = 'LTMS Portal';
const ADMIN_CONTACT = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@loms.portal';

function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER || process.env.SMTP_USER,
            pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
        },
    });
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
        timeZoneName: 'short',
    });
}

export class AccountNotificationService {

    // ── Account BLOCKED notification ──────────────────────────────────────
    async sendAccountBlockedEmail(payload: AccountEventPayload): Promise<void> {
        const { email, firstName, reason, triggeredBy, timestamp } = payload;
        const formattedTime = formatDateTime(timestamp);
        const triggeredByLabel = triggeredBy === 'system' ? 'Automated Security System' : 'Administrator';

        const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
                <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    
                    <!-- Red Header Banner -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
                            <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                                <span style="font-size:28px;">🔒</span>
                            </div>
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Account Blocked</h1>
                            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${PORTAL_NAME} — Security Notice</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <p style="color:#0f172a;font-size:15px;margin:0 0 20px;">Dear <strong>${firstName}</strong>,</p>
                            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
                                Due to security concerns, your <strong>${PORTAL_NAME}</strong> account has been <strong style="color:#dc2626;">blocked</strong>. 
                                You will not be able to log in until the account is reinstated by an administrator.
                            </p>

                            <!-- Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin-bottom:28px;">
                                <tr><td style="padding:20px 24px;">
                                    <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.08em;">Blocking Details</p>
                                    <table width="100%" cellpadding="6" cellspacing="0">
                                        <tr>
                                            <td width="40%" style="font-size:13px;color:#6b7280;font-weight:600;">Reason</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${reason}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Date &amp; Time</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${formattedTime}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Triggered By</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${triggeredByLabel}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Account Email</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${email}</td>
                                        </tr>
                                    </table>
                                </td></tr>
                            </table>

                            <!-- CTA -->
                            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
                                If you believe this is a mistake or need your account reinstated, please contact your system administrator immediately.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="background:#dc2626;border-radius:8px;">
                                        <a href="mailto:${ADMIN_CONTACT}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                                            📧 Contact Administrator
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                                This is an automated security notification from <strong>${PORTAL_NAME}</strong>. 
                                Please do not reply to this email. Contact your administrator at 
                                <a href="mailto:${ADMIN_CONTACT}" style="color:#dc2626;">${ADMIN_CONTACT}</a> for assistance.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} ${PORTAL_NAME} · Leave &amp; Travel Management System</p>
                        </td>
                    </tr>

                </table>
            </td></tr>
            </table>
        </body>
        </html>
        `;

        try {
            const transporter = createTransporter();
            await transporter.sendMail({
                from: `"${PORTAL_NAME} Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🔒 Account Blocked — ${PORTAL_NAME}`,
                html,
            });
            console.log(`[AccountNotificationService] Block email sent to ${email}`);
        } catch (err: any) {
            console.error(`[AccountNotificationService] Failed to send block email to ${email}:`, err.message);
            // Non-fatal — do not rethrow; blocking the user is more important than the email.
        }
    }

    // ── Account ACTIVATED notification ────────────────────────────────────
    async sendAccountActivatedEmail(payload: AccountEventPayload): Promise<void> {
        const { email, firstName, reason, timestamp } = payload;
        const formattedTime = formatDateTime(timestamp);
        const portalUrl = process.env.PORTAL_URL || 'http://localhost:3000/login';

        const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
            <tr><td align="center">
                <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                    <!-- Green Header Banner -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
                            <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                                <span style="font-size:28px;">✅</span>
                            </div>
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Account Activated</h1>
                            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${PORTAL_NAME} — Account Recovery</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <p style="color:#0f172a;font-size:15px;margin:0 0 20px;">Dear <strong>${firstName}</strong>,</p>
                            <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
                                Great news! Your <strong>${PORTAL_NAME}</strong> account has been <strong style="color:#16a34a;">reinstated</strong> by an administrator. 
                                You can now log in and access all portal features.
                            </p>

                            <!-- Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:28px;">
                                <tr><td style="padding:20px 24px;">
                                    <p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.08em;">Activation Details</p>
                                    <table width="100%" cellpadding="6" cellspacing="0">
                                        <tr>
                                            <td width="40%" style="font-size:13px;color:#6b7280;font-weight:600;">Status</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:600;">
                                                <span style="display:inline-block;background:#dcfce7;color:#16a34a;padding:2px 10px;border-radius:20px;font-size:12px;">✓ ACTIVE</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Activated By</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">Administrator</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Date &amp; Time</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${formattedTime}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Reason / Note</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${reason || 'Account reinstated by admin.'}</td>
                                        </tr>
                                        <tr>
                                            <td style="font-size:13px;color:#6b7280;font-weight:600;">Account Email</td>
                                            <td style="font-size:13px;color:#1e293b;font-weight:500;">${email}</td>
                                        </tr>
                                    </table>
                                </td></tr>
                            </table>

                            <!-- Login CTA -->
                            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                <tr>
                                    <td style="background:#16a34a;border-radius:8px;">
                                        <a href="${portalUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                                            🚀 Login to ${PORTAL_NAME}
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.6;">
                                If you did not request this reinstatement or have concerns, please contact 
                                <a href="mailto:${ADMIN_CONTACT}" style="color:#16a34a;">${ADMIN_CONTACT}</a> immediately.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:11px;">© ${new Date().getFullYear()} ${PORTAL_NAME} · Leave &amp; Travel Management System</p>
                        </td>
                    </tr>

                </table>
            </td></tr>
            </table>
        </body>
        </html>
        `;

        try {
            const transporter = createTransporter();
            await transporter.sendMail({
                from: `"${PORTAL_NAME}" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `✅ Account Reinstated — ${PORTAL_NAME}`,
                html,
            });
            console.log(`[AccountNotificationService] Activation email sent to ${email}`);
        } catch (err: any) {
            console.error(`[AccountNotificationService] Failed to send activation email to ${email}:`, err.message);
        }
    }
}
