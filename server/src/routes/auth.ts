import express from 'express';
import {
    register,
    login,
    googleLogin,
    sendOtp,
    verifyOtp,
} from '../controllers/AuthController';

const router = express.Router();

// ─── Email + Password ─────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);

// ─── Google OAuth ─────────────────────────────────────────────────────
router.post('/google', googleLogin);

// ─── Email OTP ────────────────────────────────────────────────────────
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

export default router;
