'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function Dashboard() {
    const { user, userRoles } = useAuth();
    const { applications, fetchApplications, loading } = useForms();

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const isAdmin = storedRoles.includes('ADMIN');
    const userId = user?.id ? Number(user.id) : null;

    const baseApps = isAdmin
        ? applications
        : (userId !== null ? applications.filter(a => Number(a.submitted_by) === userId) : []);

    const ongoingApps = baseApps.filter(a => !isTerminal(a.current_status));
    const completedApps = baseApps.filter(a => isTerminal(a.current_status));

    if (loading && applications.length === 0) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}>Loading...</div>;
    }

    return (
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', height: '100%' }}>
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
