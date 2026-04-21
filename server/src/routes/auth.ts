// ─── routes/auth.ts ───────────────────────────────────────────────────────────
// Composition root for authentication routes.
// Sole responsibility: wire up dependencies and register route handlers.
// No business logic here — all logic lives in AuthService.

import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { OtpService } from '../services/OtpService';
import { ActivityLogService } from '../services/ActivityLogService';
import prismaClient from '../prisma';

const router = express.Router();

const userRepo = new UserRepository(prismaClient);
const authService = new AuthService(userRepo);
const activityLogService = new ActivityLogService(prismaClient);
const otpService = new OtpService(prismaClient, activityLogService);
const controller = new AuthController(authService, otpService);

// ─── Email + Password ──────────────────────────────────────────────────────
router.post('/register', controller.register);
router.post('/login', controller.login);

// ─── Google OAuth ──────────────────────────────────────────────────────────
router.post('/google', controller.googleLogin);

// ─── Email OTP ─────────────────────────────────────────────────────────────
router.post('/send-otp', controller.sendOtp);
router.post('/verify-otp', controller.verifyOtp);

export default router;
