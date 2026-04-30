'use client';
// ─── Dashboard Layout ──────────────────────────────────────────────────────────
// Renders the persistent sidebar for all /dashboard/* routes.

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { getApplicationStatus, getApplicationSubmitterId, getLatestForward } from '@/types';
import { Menu, X } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, userRoles, logout } = useAuth();
    const { applications, fetchApplications } = useForms();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [actingRoles, setActingRoles] = useState<any[]>([]);

    useEffect(() => {
        fetchApplications();

        const handleUpdate = () => {
            fetchApplications();
        };

        window.addEventListener('applications-updated', handleUpdate);
        
        const fetchActingRoles = async () => {
            try {
                const res = await api.get('/acting-roles/active');
                setActingRoles(res.data);
            } catch (err) {
                console.error('Failed to load acting roles', err);
            }
        };
        if (user) {
            fetchActingRoles();
        }

        return () => window.removeEventListener('applications-updated', handleUpdate);
    }, [fetchApplications, user]);

    // Close mobile sidebar on route change
    useEffect(() => {
        const handleRouteChange = () => setIsMobileOpen(false);
        window.addEventListener('popstate', handleRouteChange);
        return () => window.removeEventListener('popstate', handleRouteChange);
    }, []);

    // Determine if user is a native approver (not Instructor/Staff)
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const canApprove = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER_ROLES.includes(r));

    const pendingApps = applications.filter(a => {
        const status = getApplicationStatus(a);
        const latestForward = getLatestForward(a);
        if (getApplicationSubmitterId(a) === Number(user?.id) || ['APPROVED', 'REJECTED'].includes(status)) return false;
        return latestForward?.action === 'forwarded' && Number(latestForward.forwarded_to) === Number(user?.id);
    });

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc' }} className="relative flex h-screen overflow-hidden bg-slate-50 font-sans">
            
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <Sidebar
                canApprove={canApprove}
                pendingCount={pendingApps.length}
                onLogout={logout}
                isMobileOpen={isMobileOpen}
                onCloseMobile={() => setIsMobileOpen(false)}
                actingRoles={actingRoles}
            />
            
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Mobile Header with Hamburger */}
                <div className="md:hidden flex items-center p-4 bg-white border-b border-slate-200 shrink-0 shadow-sm z-30">
                    <button 
                        onClick={() => setIsMobileOpen(true)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-3 font-semibold text-slate-800">LTMS Dashboard</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
