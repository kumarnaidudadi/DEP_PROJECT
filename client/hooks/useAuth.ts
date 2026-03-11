// ─── useAuth ───────────────────────────────────────────────────────────────────
// Reads the stored token/user from localStorage. Redirects to /login if missing.

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            setUserRoles(parsed.roles || []);
        }
    }, [router]);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    return { user, userRoles, logout };
}
