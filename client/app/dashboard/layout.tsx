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
    const [profileNotificationDot, setProfileNotificationDot] = useState(false);

    useEffect(() => {
        fetchApplications();

        const handleUpdate = () => {
            fetchApplications();
        };

        const handleProfileViewed = () => {
            setProfileNotificationDot(false);
            localStorage.setItem('last_seen_acting_roles', Date.now().toString());
        };

        window.addEventListener('applications-updated', handleUpdate);
        window.addEventListener('profile-viewed', handleProfileViewed);
        
        const fetchActingRolesData = async () => {
            try {
                const [activeRes, sentRes, receivedRes] = await Promise.all([
                    api.get('/acting-roles/active').catch(() => ({ data: [] })),
                    api.get('/acting-roles/sent').catch(() => ({ data: [] })),
                    api.get('/acting-roles/received').catch(() => ({ data: [] }))
                ]);
                setActingRoles(activeRes.data);

                const pendingReceived = (receivedRes.data || []).filter((r: any) => r.status === 'pending');
                const acceptedSent = (sentRes.data || []).filter((r: any) => r.status === 'accepted');
                
                const relevantRequests = [...pendingReceived, ...acceptedSent];
                if (relevantRequests.length > 0) {
                    const latestUpdate = Math.max(...relevantRequests.map((r: any) => new Date(r.updated_at || r.created_at || new Date()).getTime()));
                    const lastSeen = parseInt(localStorage.getItem('last_seen_acting_roles') || '0', 10);
                    if (latestUpdate > lastSeen) {
                        setProfileNotificationDot(true);
                    }
                }
            } catch (err) {
                console.error('Failed to load acting roles', err);
            }
        };
        
        if (user) {
            fetchActingRolesData();
        }

        return () => {
            window.removeEventListener('applications-updated', handleUpdate);
            window.removeEventListener('profile-viewed', handleProfileViewed);
        };
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
