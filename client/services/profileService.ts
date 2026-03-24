// ─── Profile Service ───────────────────────────────────────────────────────────
// Pure API functions for user profile operations.

import api from '@/lib/api';
import { Profile } from '@/types';

export async function getProfile(): Promise<Profile> {
    const res = await api.get('/profile');
    return res.data;
}

export async function getRoles(): Promise<string[]> {
    const res = await api.get('/profile/roles');
    return res.data.map((role: any) => role.name);
}

export async function getDepartments(): Promise<any[]> {
    const res = await api.get('/profile/departments');
    return res.data;
}

export async function uploadSignature(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('signature', file);
    const res = await api.post('/profile/signature', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.signature_url as string;
}

/** Fetches the decrypted signature image and returns a blob URL for display */
export async function getDecryptedSignatureUrl(): Promise<string | null> {
    try {
        const res = await api.get('/profile/signature-image', { responseType: 'blob' });
        return URL.createObjectURL(res.data as Blob);
    } catch {
        return null;
    }
}
