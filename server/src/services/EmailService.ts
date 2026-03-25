import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { IEmailService, EmailMetadata } from './IEmailService';

export class EmailService implements IEmailService {
    private transporter: nodemailer.Transporter;

    constructor(private readonly prisma: PrismaClient) {
        // Fallback to Gmail if SMTP_HOST is not explicitly defined in the environment.
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true' || false, // Use SSL/TLS if specified
            auth: {
                user: process.env.EMAIL_USER || process.env.SMTP_USER,
                pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
            },
        });
    }

    async sendEmailNotification(eventType: 'REQUEST_ASSIGNED' | 'REQUEST_COMPLETED', recipient: string, metadata: EmailMetadata): Promise<void> {
        if (!recipient) return;

        let subject = '';
        let htmlBody = '';

        if (eventType === 'REQUEST_ASSIGNED') {
            subject = `Action Required: New Request Assigned (${metadata.formType})`;
            htmlBody = `
                <h2>Action Required</h2>
                <p>A new request has been assigned to you for approval.</p>
                <ul>
                    <li><strong>Applicant:</strong> ${metadata.applicantName}</li>
                    <li><strong>Form Type:</strong> ${metadata.formType}</li>
                    <li><strong>Request ID:</strong> ${metadata.requestId}</li>
                    <li><strong>Submission Date:</strong> ${metadata.timestamp.toLocaleDateString()}</li>
                    <li><strong>Current Step:</strong> ${metadata.currentStep}</li>
                </ul>
                <p><a href="${metadata.actionUrl}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Pending Work</a></p>
            `;
        } else if (eventType === 'REQUEST_COMPLETED') {
            subject = `Update: Request Fully Approved (${metadata.formType})`;
            htmlBody = `
                <h2>Request Approved</h2>
                <p>Your request has been fully approved and the workflow is completed.</p>
                <ul>
                    <li><strong>Request ID:</strong> ${metadata.requestId}</li>
                    <li><strong>Form Type:</strong> ${metadata.formType}</li>
                    <li><strong>Approval Date:</strong> ${metadata.timestamp.toLocaleDateString()}</li>
                    <li><strong>Final Status:</strong> ${metadata.status}</li>
                </ul>
                <p><a href="${metadata.actionUrl}" style="padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">View Request Details</a></p>
            `;
        }

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || `"Workflow System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'workflow@dep-project.local'}>`,
                to: recipient,
                subject,
                html: htmlBody,
            });

            // Log success
            await this.prisma.email_logs.create({
                data: {
                    event_type: eventType,
                    recipient,
                    subject,
                    body: htmlBody,
                    status: 'SENT',
                    sent_at: new Date()
                }
            });
        } catch (error: any) {
            console.error('[EmailService] Failed to send email:', error.message);
            // Log failure
            await this.prisma.email_logs.create({
                data: {
                    event_type: eventType,
                    recipient,
                    subject,
                    body: htmlBody,
                    status: 'FAILED',
                    error: error.message
                }
            });
        }
    }
}
