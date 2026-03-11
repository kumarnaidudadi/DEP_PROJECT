// ─── Auth Service ──────────────────────────────────────────────────────────────
// Pure API functions — no React state, no hooks.
// All auth-related HTTP calls are centralised here.

import api from '@/lib/api';

export async function sendOtp(email: string): Promise<void> {
    await api.post('/auth/send-otp', { email });
}

export async function verifyOtp(email: string, otp: string): Promise<{ token: string; user: any }> {
    const res = await api.post('/auth/verify-otp', { email, otp });
    return res.data;
}

export async function googleLogin(credential: string): Promise<{ token: string; user: any }> {
    const res = await api.post('/auth/google', { token: credential });
    return res.data;
}
