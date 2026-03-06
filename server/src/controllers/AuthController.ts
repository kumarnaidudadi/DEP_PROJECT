import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import prisma from '../prisma';

// ─── Helper: Generate JWT ────────────────────────────────────────────
function generateToken(userId: number, email: string, roles: string[] = []) {
    const secret = process.env.JWT_SECRET || 'supersecretkey';
    return jwt.sign(
        { userId, email, roles },
        secret,
        { expiresIn: '1d' }
    );
}

// ─── Helper: Create Nodemailer transporter ───────────────────────────
function createMailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

// ─── Helper: Generate 6-digit OTP ────────────────────────────────────
function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ═══════════════════════════════════════════════════════════════════════
// REGISTER — Email + Password
// ═══════════════════════════════════════════════════════════════════════
export async function register(req: Request, res: Response) {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
        res.status(400).json({ error: 'All fields are required: first_name, last_name, email, password' });
        return;
    }

    try {
        const existingUser = await prisma.users.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.users.create({
            data: {
                first_name,
                last_name,
                email,
                password_hash: passwordHash,
                auth_provider: 'email',
            },
        });

        const token = generateToken(user.id, user.email);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
            },
        });
    } catch (error: any) {
        console.error('Register error:', error?.message || error);
        res.status(500).json({ error: 'Registration failed', details: error?.message });
    }
}

// ─── Helper: Ensure User Has Role (Self-Healing) ──────────────────────
async function ensureUserHasRole(user: any): Promise<string[]> {
    let roleNames = user.user_roles.map((ur: any) => ur.roles.name);

    if (roleNames.length === 0) {
        console.log(`[Auth] User ${user.email} has no roles. Assigning default 'APPLICANT'.`);
        const defaultRole = await prisma.roles.findFirst({
            where: { name: { equals: 'APPLICANT', mode: 'insensitive' } }
        });

        if (defaultRole) {
            await prisma.user_roles.create({
                data: {
                    user_id: user.id,
                    role_id: defaultRole.id
                }
            });
            roleNames = [defaultRole.name];
        } else {
            console.error('[Auth] Default role APPLICANT not found in DB');
        }
    }
    return roleNames;
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN — Email + Password
// ═══════════════════════════════════════════════════════════════════════
export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    try {
        const user = await prisma.users.findUnique({
            where: { email },
            include: { user_roles: { include: { roles: true } } },
        });

        if (!user) {
            res.status(403).json({ error: 'Access denied. You are not registered.' });
            return;
        }

        if (!user.password_hash) {
            res.status(403).json({ error: 'Access denied. Setup password first or use Google login.' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const roleNames = await ensureUserHasRole(user);
        const token = generateToken(user.id, user.email, roleNames);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                roles: roleNames,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error?.message || error);
        res.status(500).json({ error: 'Login failed', details: error?.message });
    }
}


// ═══════════════════════════════════════════════════════════════════════
// GOOGLE LOGIN — Verify Google ID token, STRICT LOGIN (No Auto-Create)
// ═══════════════════════════════════════════════════════════════════════
export async function googleLogin(req: Request, res: Response) {
    const { token: idToken } = req.body;

    if (!idToken) {
        res.status(400).json({ error: 'Google ID token is required' });
        return;
    }

    try {
        // Read client ID at request time (after dotenv has loaded)
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const googleClient = new OAuth2Client(clientId);

        console.log('Google Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET');

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: clientId,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            res.status(401).json({ error: 'Invalid Google token' });
            return;
        }

        const { email } = payload;

        // Find user - STRICT: Must exist in DB
        const user = await prisma.users.findUnique({
            where: { email },
            include: { user_roles: { include: { roles: true } } },
        });

        if (!user) {
            // STRICT: Do NOT create user. Return 403.
            console.log(`[Google Login] Access denied for unregistered email: ${email}`);
            res.status(403).json({ error: 'Access denied. You are not registered.' });
            return;
        }

        const roleNames = await ensureUserHasRole(user);
        const jwtToken = generateToken(user.id, user.email, roleNames);

        res.json({
            token: jwtToken,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                roles: roleNames,
            },
        });
    } catch (error: any) {
        console.error('Google login error:', error?.message || error);
        res.status(401).json({ error: 'Google authentication failed', details: error?.message });
    }
}

// ═══════════════════════════════════════════════════════════════════════
// SEND OTP — Generate and email a 6-digit OTP
// ═══════════════════════════════════════════════════════════════════════
export async function sendOtp(req: Request, res: Response) {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    try {
        const otpCode = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        console.log(`[OTP] Generating OTP for ${email}, EMAIL_USER=${process.env.EMAIL_USER}`);

        // Check if user exists - STRICT OTP
        const user = await prisma.users.findUnique({
            where: { email },
        });

        if (!user) {
            console.log(`[OTP] Access denied for unregistered email: ${email}`);
            res.status(403).json({ error: 'Access denied. You are not registered.' });
            return;
        }

        // Update user with OTP
        await prisma.users.update({
            where: { email },
            data: {
                otp_code: otpCode,
                otp_expiry: otpExpiry,
            },
        });

        console.log(`[OTP] User upserted, sending email...`);

        // Send OTP via Gmail SMTP
        const transporter = createMailTransporter();

        // Verify SMTP connection first
        await transporter.verify();
        console.log(`[OTP] SMTP connection verified`);

        await transporter.sendMail({
            from: `"DEP Portal" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Login OTP — DEP Portal',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8f9fa; border-radius: 12px;">
                    <h2 style="color: #1a1a2e; margin-bottom: 8px;">🔐 Your One-Time Password</h2>
                    <p style="color: #555; margin-bottom: 24px;">Use the code below to sign in to DEP Portal:</p>
                    <div style="background: #1a1a2e; color: #fff; font-size: 32px; letter-spacing: 8px; text-align: center; padding: 16px; border-radius: 8px; font-weight: bold;">
                        ${otpCode}
                    </div>
                    <p style="color: #888; font-size: 13px; margin-top: 20px;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });

        console.log(`[OTP] Email sent successfully to ${email}`);
        res.json({ message: 'OTP sent successfully to your email' });
    } catch (error: any) {
        console.error('Send OTP error:', error?.message || error);
        console.error('Full error:', error);
        res.status(500).json({ error: 'Failed to send OTP', details: error?.message });
    }
}

// ═══════════════════════════════════════════════════════════════════════
// VERIFY OTP — Compare OTP, check expiry, return JWT
// ═══════════════════════════════════════════════════════════════════════
export async function verifyOtp(req: Request, res: Response) {
    const { email, otp } = req.body;

    if (!email || !otp) {
        res.status(400).json({ error: 'Email and OTP are required' });
        return;
    }

    try {
        const user = await prisma.users.findUnique({
            where: { email },
            include: { user_roles: { include: { roles: true } } },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (!user.otp_code || !user.otp_expiry) {
            res.status(400).json({ error: 'No OTP was requested for this email' });
            return;
        }

        if (new Date() > user.otp_expiry) {
            res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
            return;
        }

        if (user.otp_code !== otp) {
            res.status(401).json({ error: 'Invalid OTP' });
            return;
        }

        // Clear OTP after successful verification
        await prisma.users.update({
            where: { email },
            data: { otp_code: null, otp_expiry: null },
        });

        const roleNames = await ensureUserHasRole(user);
        const token = generateToken(user.id, user.email, roleNames);

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                roles: roleNames,
            },
        });
    } catch (error: any) {
        console.error('Verify OTP error:', error?.message || error);
        res.status(500).json({ error: 'OTP verification failed', details: error?.message });
    }
}
