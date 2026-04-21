// ─── AuthController ───────────────────────────────────────────────────────────
// HTTP-only layer for authentication endpoints.
// Single Responsibility: translate HTTP request → DTO → service call → HTTP response.
// No business logic, no Prisma imports. Depends on IAuthService interface.

import { Request, Response } from 'express';
import { IAuthService } from '../services/IAuthService';
import { OtpService } from '../services/OtpService';

export class AuthController {
    // Dependency Injection: receives service interface, not concrete class
    constructor(private readonly authService: IAuthService, private readonly otpService?: OtpService) { }

    register = async (req: Request, res: Response): Promise<void> => {
        const { first_name, last_name, email, password } = req.body;

        if (!first_name || !last_name || !email || !password) {
            res.status(400).json({ error: 'All fields are required: first_name, last_name, email, password' });
            return;
        }

        try {
            const result = await this.authService.register({ first_name, last_name, email, password });
            res.status(201).json(result);
        } catch (e: any) {
            console.error('[AuthController] register:', e.message);
            if (e.message === 'USER_ALREADY_EXISTS') {
                res.status(409).json({ error: 'User with this email already exists' });
            } else {
                res.status(500).json({ error: 'Registration failed', details: e.message });
            }
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        try {
            const result = await this.authService.login({ email, password });
            res.json(result);
        } catch (e: any) {
            console.error('[AuthController] login:', e.message);
            if (e.message === 'ACCESS_DENIED') res.status(403).json({ error: 'Access denied. You are not registered.' });
            else if (e.message === 'NO_PASSWORD') res.status(403).json({ error: 'Setup password first or use Google login.' });
            else if (e.message === 'INVALID_CREDENTIALS') res.status(401).json({ error: 'Invalid credentials' });
            else res.status(500).json({ error: 'Login failed', details: e.message });
        }
    };

    googleLogin = async (req: Request, res: Response): Promise<void> => {
        const { token: idToken } = req.body;

        if (!idToken) {
            res.status(400).json({ error: 'Google ID token is required' });
            return;
        }

        try {
            const result = await this.authService.googleLogin(idToken);
            res.json(result);
        } catch (e: any) {
            console.error('[AuthController] googleLogin:', e.message);
            if (e.message === 'ACCESS_DENIED') res.status(403).json({ error: 'Access denied. You are not registered.' });
            else if (e.message === 'INVALID_GOOGLE_TOKEN') res.status(401).json({ error: 'Invalid Google token' });
            else res.status(401).json({ error: 'Google authentication failed', details: e.message });
        }
    };

    sendOtp = async (req: Request, res: Response): Promise<void> => {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        try {
            if (this.otpService) {
                await this.otpService.sendOtp(email);
            } else {
                await this.authService.sendOtp(email);
            }
            res.json({ message: 'OTP sent successfully to your email' });
        } catch (e: any) {
            console.error('[AuthController] sendOtp:', e.message);
            if (e.message === 'ACCESS_DENIED') res.status(403).json({ error: 'Access denied. You are not registered.' });
            else res.status(500).json({ error: 'Failed to send OTP', details: e.message });
        }
    };

    verifyOtp = async (req: Request, res: Response): Promise<void> => {
        const { email, otp } = req.body;

        if (!email || !otp) {
            res.status(400).json({ error: 'Email and OTP are required' });
            return;
        }

        try {
            if (this.otpService) {
                const result = await this.otpService.verifyOtp(email, otp);
                if (!result.success) {
                    if (result.deactivated) {
                        res.status(403).json({ error: result.message || 'Account deactivated', locked: true });
                    } else if (result.shouldWarn) {
                        res.status(401).json({ error: result.message || 'Warning', warning: true });
                    } else {
                        res.status(401).json({ error: result.message || 'Invalid OTP' });
                    }
                    return;
                }
                
                // Using the generated token logic from AuthService logic implicitly via internal verify 
                // but since OtpService doesn't generate JWT, we need AuthService to generate the token!
                // Ah! I should let OtpService delegate back to AuthService OR we generate JWT in AuthController.
                // Let's fallback to authService for the token part if Otp verifies! 
                const authResult = await this.authService.verifyOtp(email, otp);
                res.json(authResult);
            } else {
                const result = await this.authService.verifyOtp(email, otp);
                res.json(result);
            }
        } catch (e: any) {
            console.error('[AuthController] verifyOtp:', e.message);
            if (e.message === 'USER_NOT_FOUND') res.status(404).json({ error: 'User not found' });
            else if (e.message === 'NO_OTP_REQUESTED') res.status(400).json({ error: 'No OTP was requested for this email' });
            else if (e.message === 'OTP_EXPIRED') res.status(401).json({ error: 'OTP has expired. Please request a new one.' });
            else if (e.message === 'INVALID_OTP') res.status(401).json({ error: 'Invalid OTP' });
            else res.status(500).json({ error: 'OTP verification failed', details: e.message });
        }
    };
}
