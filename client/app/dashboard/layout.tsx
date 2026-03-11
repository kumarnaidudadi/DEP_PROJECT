'use client';
// ─── Dashboard Layout ──────────────────────────────────────────────────────────
// Renders the persistent sidebar for all /dashboard/* routes.

import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, userRoles, logout } = useAuth();
    const { applications, fetchApplications } = useForms();

    useEffect(() => {
        fetchApplications();

        const handleUpdate = () => {
            fetchApplications();
        };

        window.addEventListener('applications-updated', handleUpdate);
        return () => window.removeEventListener('applications-updated', handleUpdate);
    }, [fetchApplications]);

    // Determine if user can approve (for pending badge)
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const canApprove = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER_ROLES.includes(r));

    const pendingApps = applications.filter(a => {
        if (Number(a.submitted_by) === Number(user?.id) || ['APPROVED', 'REJECTED'].includes(a.current_status)) return false;
        return a.form_approvals?.some((appr: any) => appr.decision === 'PENDING' && Number(appr.approved_by) === Number(user?.id));
    });

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc' }}>
            <Sidebar
                canApprove={canApprove}
                pendingCount={pendingApps.length}
                onLogout={logout}
            />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>
        </div>
    );
}
