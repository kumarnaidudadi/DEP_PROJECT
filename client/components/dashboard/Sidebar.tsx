'use client';
// ─── Sidebar ───────────────────────────────────────────────────────────────────
// Icon-only sidebar with tooltips. Uses Next.js router for navigation.

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    FilePlus, FileText, ClipboardList,
    User, LogOut, Building2, Activity,
    Users, X, BarChart2, Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
    canApprove: boolean;
    pendingCount: number;
    onLogout: () => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
    actingRoles?: any[];
}

const SB_W = 64;

export default function Sidebar({ canApprove, pendingCount, onLogout, isMobileOpen = false, onCloseMobile, actingRoles = [] }: SidebarProps) {
    const router   = useRouter();
    const pathname = usePathname();

    const { userRoles } = useAuth();
    const isAdmin = userRoles.some(r => ['ADMIN', 'SUPER_ADMIN'].includes(r));

    // Close mobile sidebar when pathname changes
    useEffect(() => {
        if (isMobileOpen && onCloseMobile) onCloseMobile();
    }, [pathname]);

    // ── Nav button (blue, standard) ───────────────────────────────────────────
    const navBtn = (href: string, icon: React.ReactNode, label: string, badge?: number) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
            <div key={href} style={{ position: 'relative' }} className="group">
                <button
                    onClick={() => router.push(href)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '12px 0', border: 'none',
                        background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                        color: active ? '#3b82f6' : '#6b7280',
                        cursor: 'pointer',
                        borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                    <span style={{ flexShrink: 0 }}>{icon}</span>
                    {badge && (
                        <span style={{ position: 'absolute', top: '4px', right: '12px', background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '10px' }}>
                            {badge}
                        </span>
                    )}
                </button>
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                    {label}
                </div>
            </div>
        );
    };

    // ── Acting nav button (purple, distinct) ──────────────────────────────────
    const actingNavBtn = (ar: any) => {
        const href   = `/dashboard/acting-pending/${ar.id}`;
        const active = pathname.startsWith(href);
        const label  = `${ar.acting_role} (Acting)`;
        const count  = ar.pending_count as number | undefined;
        return (
            <div key={href} style={{ position: 'relative' }} className="group">
                <button
                    onClick={() => router.push(href)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '12px 0', border: 'none',
                        background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
                        color: active ? '#7c3aed' : '#9ca3af',
                        cursor: 'pointer',
                        borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                    <span style={{ flexShrink: 0 }}>
                        <Clock size={20} />
                    </span>
                    {/* Badge: red dot with count, same style as pending work badge */}
                    {count != null && count > 0 && (
                        <span style={{
                            position: 'absolute', top: '4px', right: '12px',
                            background: '#ef4444', color: '#fff',
                            fontSize: '9px', fontWeight: 700,
                            padding: '2px 5px', borderRadius: '10px',
                        }}>
                            {count}
                        </span>
                    )}
                </button>
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg pointer-events-none"
                    style={{ background: '#5b21b6', border: '1px solid #7c3aed' }}>
                    {label}{count != null && count > 0 ? ` · ${count} pending` : ''}
                </div>
            </div>
        );
    };

    return (
        <aside style={{
            width: SB_W, minWidth: SB_W,
            background: '#ffffff', color: '#374151',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
            zIndex: 100, boxShadow: '2px 0 16px rgba(0,0,0,0.05)',
            borderRight: '1px solid #e5e7eb',
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '68px', position: 'relative' }}>
                <img src="/iit-ropar.jpg" alt="IIT Ropar Logo" style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
                {isMobileOpen && (
                    <button
                        onClick={onCloseMobile}
                        className="absolute -right-12 top-4 p-2 bg-white rounded-r-lg shadow-md md:hidden text-slate-500 hover:text-slate-800"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Standard nav items */}
                {navBtn('/dashboard/all', <FileText size={20} />, 'All Applications')}
                {/* Own pending work — only for native approvers */}
                {canApprove && navBtn('/dashboard/pending', <ClipboardList size={20} />, 'Pending Work', pendingCount || undefined)}
                {/* Acting pending work — one entry per active acting role */}
                {actingRoles.map(ar => actingNavBtn(ar))}
                {/* Divider between work + tools */}
                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 12px' }} />
                {navBtn('/dashboard/new', <FilePlus size={20} />, 'New Application')}
                {isAdmin && (
                    <>
                        {navBtn('/dashboard/user-management', <Users size={20} />, 'User Management')}
                        {navBtn('/dashboard/system-logs',    <Activity size={20} />, 'System Logs')}
                        {navBtn('/dashboard/statistics',     <BarChart2 size={20} />, 'Statistics')}
                    </>
                )}
            </nav>

            {/* Bottom: profile + logout */}
            <div style={{ padding: '12px 0', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navBtn('/dashboard/profile', <User size={20} />, 'Profile')}
                <div style={{ position: 'relative' }} className="group">
                    <button
                        onClick={() => { if (window.confirm('Are you sure you want to sign out?')) onLogout(); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', border: 'none', background: 'transparent', color: '#6b7280', cursor: 'pointer', transition: 'background 0.2s', borderLeft: '3px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={20} />
                    </button>
                    <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                        Sign Out
                    </div>
                </div>
            </div>
        </aside>
    );
}
