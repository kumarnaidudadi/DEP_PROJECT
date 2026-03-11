'use client';
// ─── Dashboard Home (/dashboard) ───────────────────────────────────────────────

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useEffect } from 'react';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function DashboardHome() {
    const { user } = useAuth();
    const { applications, fetchApplications } = useForms();

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const myApps = applications.filter(a => Number(a.submitted_by) === Number(user?.id));
    const ongoingApps = myApps.filter(a => !isTerminal(a.current_status));
    const completedApps = myApps.filter(a => isTerminal(a.current_status));

    return (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <WelcomeScreen
                user={user}
                stats={{ total: myApps.length, ongoing: ongoingApps.length, completed: completedApps.length }}
            />
        </main>
    );
}
