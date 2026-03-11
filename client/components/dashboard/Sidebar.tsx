'use client';
// ─── Sidebar ───────────────────────────────────────────────────────────────────
// Icon-only sidebar with tooltips. Extracted from dashboard/page.tsx.

import React from 'react';
import {
    FilePlus, FileText, ClipboardList, LayoutDashboard,
    User, LogOut, Building2
} from 'lucide-react';
import { SidebarView } from '@/types';

interface SidebarItem {
    id: SidebarView;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}

interface SidebarProps {
    activeView: SidebarView;
    canApprove: boolean;
    pendingCount: number;
    onNavigate: (view: SidebarView) => void;
    onLogout: () => void;
}

const SB_W = 64;

export default function Sidebar({ activeView, canApprove, pendingCount, onNavigate, onLogout }: SidebarProps) {
    const items: SidebarItem[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { id: 'new', icon: <FilePlus size={20} />, label: 'New Application' },
        { id: 'all', icon: <FileText size={20} />, label: 'All Applications' },
        ...(canApprove ? [{ id: 'pending' as SidebarView, icon: <ClipboardList size={20} />, label: 'Pending Work', badge: pendingCount || undefined }] : []),
    ];

    const navBtn = (id: SidebarView, icon: React.ReactNode, label: string, badge?: number) => {
        const active = activeView === id;
        return (
            <div key={id} style={{ position: 'relative' }} className="group">
                <button
                    onClick={() => onNavigate(id)}
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
                {/* Tooltip */}
                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                    {label}
                </div>
            </div>
        );
    };

    return (
        <aside style={{
            width: SB_W, minWidth: SB_W,
            background: '#ffffff', color: '#374151',
            display: 'flex', flexDirection: 'column',
            zIndex: 20, boxShadow: '2px 0 16px rgba(0,0,0,0.05)',
            borderRight: '1px solid #e5e7eb',
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '68px' }}>
                <Building2 size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(item => navBtn(item.id, item.icon, item.label, item.badge))}
            </nav>

            {/* Bottom: profile + logout */}
            <div style={{ padding: '12px 0', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navBtn('profile', <User size={20} />, 'Profile')}
                <div style={{ position: 'relative' }} className="group">
                    <button onClick={onLogout} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '12px 0', border: 'none', background: 'transparent',
                        color: '#6b7280', cursor: 'pointer', transition: 'background 0.2s',
                        borderLeft: '3px solid transparent',
                    }}
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
