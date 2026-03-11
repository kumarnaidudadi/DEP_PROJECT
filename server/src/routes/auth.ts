// ─── routes/auth.ts ───────────────────────────────────────────────────────────
// Composition root for authentication routes.
// Sole responsibility: wire up dependencies and register route handlers.
// No business logic here — all logic lives in AuthService.

import express from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import prismaClient from '../prisma';

const router = express.Router();

// ─── Dependency Injection (manual composition root) ────────────────────────
const userRepo = new UserRepository(prismaClient);
const authService = new AuthService(userRepo);
const controller = new AuthController(authService);

// ─── Email + Password ──────────────────────────────────────────────────────
router.post('/register', controller.register);
router.post('/login', controller.login);

// ─── Google OAuth ──────────────────────────────────────────────────────────
router.post('/google', controller.googleLogin);

// ─── Email OTP ─────────────────────────────────────────────────────────────
router.post('/send-otp', controller.sendOtp);
router.post('/verify-otp', controller.verifyOtp);

export default router;
