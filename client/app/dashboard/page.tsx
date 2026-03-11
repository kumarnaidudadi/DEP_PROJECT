'use client';
// ─── Dashboard Home (/dashboard) ───────────────────────────────────────────────

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function DashboardHome() {
    const { user, userRoles } = useAuth();
    const { applications, fetchApplications } = useForms();

    useEffect(() => {
        if (user?.id) {
            fetchApplications();
        }
    }, [fetchApplications, user?.id]);

    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const isAdmin = storedRoles.includes('ADMIN');
    const userId = user?.id ? Number(user.id) : null;

    // Admin sees all applications in stats; regular users see only theirs
    const baseApps = isAdmin 
        ? applications 
        : (userId !== null ? applications.filter(a => Number(a.submitted_by) === userId) : []);

    const ongoingApps = baseApps.filter(a => !isTerminal(a.current_status));
    const completedApps = baseApps.filter(a => isTerminal(a.current_status));

    return (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <WelcomeScreen
                user={user}
                stats={{ 
                    total: baseApps.length, 
                    ongoing: ongoingApps.length, 
                    completed: completedApps.length 
                }}
            />
        </main>
    );
}
