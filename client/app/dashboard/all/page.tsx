'use client';
// ─── /dashboard/all ────────────────────────────────────────────────────────────
// All Applications: Clean list view — form name, date, status. Custom dropdowns.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Loader2, Search, FileText, CheckCircle, Clock,
    ChevronRight, CalendarDays, ChevronDown, Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { Application, AppTab } from '@/types';
import StatusBadge from '@/components/dashboard/StatusBadge';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

// ── Coloured file icon ────────────────────────────────────────────────────────
function FormIcon({ status }: { status: string }) {
    const ok = status === 'APPROVED';
    const no = status === 'REJECTED';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : '#fef3c7';
    const c  = ok ? '#16a34a' : no ? '#dc2626' : '#d97706';
    return (
        <div style={{
            width: 42, height: 42, borderRadius: '10px', flexShrink: 0,
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <FileText size={19} style={{ color: c }} />
        </div>
    );
}

// ── Custom dropdown ───────────────────────────────────────────────────────────
interface DropdownProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    minWidth?: number;
    alignRight?: boolean;
}
function Dropdown({ label, value, options, onChange, minWidth = 160, alignRight = false }: DropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);
    const displayLabel = selected && selected.value !== 'all' ? selected.label : label;
    const isFiltered = value !== 'all';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 14px',
                    background: isFiltered ? '#eff6ff' : '#fff',
                    border: `1px solid ${isFiltered ? '#bfdbfe' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: isFiltered ? 600 : 500,
                    color: isFiltered ? '#1d4ed8' : '#4b5563',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minWidth,
                    justifyContent: 'space-between',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {displayLabel}
                </span>
                <ChevronDown
                    size={14}
                    style={{
                        color: isFiltered ? '#1d4ed8' : '#9ca3af',
                        flexShrink: 0,
                        transition: 'transform 0.15s',
                        transform: open ? 'rotate(180deg)' : 'none',
                    }}
                />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)',
                    ...(alignRight ? { right: 0 } : { left: 0 }),
                    zIndex: 999,
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    minWidth: Math.max(minWidth, 180), maxWidth: 280,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    animation: 'dropIn 0.12s ease-out',
                }}>
                    {options.map(opt => {
                        const active = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                title={opt.label}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 16px',
                                    fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#1d4ed8' : '#374151',
                                    background: active ? '#eff6ff' : 'transparent',
                                    cursor: 'pointer',
                                    transition: 'background 0.1s',
                                    overflow: 'hidden',
                                }}
                                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {opt.label}
                                </span>
                                {active && <Check size={13} style={{ color: '#2563eb', flexShrink: 0 }} />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function AllApplicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications } = useForms();
    const { profile, fetchProfile } = useProfile();

    const [searchQuery, setSearchQuery]       = useState('');
    const [filterFormType, setFilterFormType] = useState<string>('all');
    const [filterStatus, setFilterStatus]     = useState<string>('all');
    const [sortOrder, setSortOrder]           = useState<'desc' | 'asc'>('desc');
    const [appTab, setAppTab]                 = useState<AppTab>((searchParams.get('tab') as AppTab) || 'ongoing');
    const [hoveredId, setHoveredId]           = useState<number | null>(null);

    useEffect(() => { fetchApplications(); fetchProfile(); }, [fetchApplications, fetchProfile]);

    const handleSelectApplication = (app: Application) => {
        router.push(`/dashboard/all/${app.id}?tab=${appTab}`);
    };

    const handleTabChange = (tab: AppTab) => {
        setAppTab(tab);
        router.push(`/dashboard/all?tab=${tab}`);
    };

    // ── Filtering & sorting ──────────────────────────────────────────────────
    const isAdmin = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : '')).includes('ADMIN');
    
    const baseApps = isAdmin
        ? applications
        : applications.filter(a => Number(a.submitted_by) === Number(user?.id));

    let list = appTab === 'ongoing'
        ? baseApps.filter(a => !isTerminal(a.current_status))
        : baseApps.filter(a => isTerminal(a.current_status));

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a =>
            a.form_types?.name.toLowerCase().includes(q) ||
            a.users?.first_name.toLowerCase().includes(q) ||
            a.users?.last_name.toLowerCase().includes(q)
        );
    }
    if (filterFormType !== 'all') list = list.filter(a => a.form_types?.name === filterFormType);
    if (filterStatus   !== 'all') list = list.filter(a => a.current_status === filterStatus);

    list.sort((a, b) => {
        const tA = new Date(a.submitted_at).getTime();
        const tB = new Date(b.submitted_at).getTime();
        return sortOrder === 'desc' ? tB - tA : tA - tB;
    });

    const uniqueFormTypes = Array.from(new Set(baseApps.map(a => a.form_types?.name).filter(Boolean))) as string[];
    const uniqueStatuses  = Array.from(new Set(baseApps.map(a => a.current_status).filter(Boolean))) as string[];

    const formTypeOptions = [
        { value: 'all', label: 'All Form Types' },
        ...uniqueFormTypes.map(ft => ({ value: ft, label: ft })),
    ];
    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        ...uniqueStatuses.map(s => ({ value: s, label: s.replace(/_/g, ' ') })),
    ];
    const sortOptions = [
        { value: 'desc', label: 'Newest First' },
        { value: 'asc',  label: 'Oldest First' },
    ];

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{ padding: '20px 32px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>

                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            All Applications
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {list.length} {appTab} application{list.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Search */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 14px', width: '210px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                style={{
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '13px', color: '#374151', width: '100%',
                                }}
                            />
                        </div>

                        {/* Custom dropdowns */}
                        <Dropdown
                            label="All Form Types"
                            value={filterFormType}
                            options={formTypeOptions}
                            onChange={setFilterFormType}
                            minWidth={150}
                        />
                        <Dropdown
                            label="All Statuses"
                            value={filterStatus}
                            options={statusOptions}
                            onChange={setFilterStatus}
                            minWidth={130}
                        />
                        <Dropdown
                            label="Sort"
                            value={sortOrder}
                            options={sortOptions}
                            onChange={v => setSortOrder(v as 'asc' | 'desc')}
                            minWidth={130}
                            alignRight
                        />
                    </div>
                </div>

                {/* Tab pills */}
                <div style={{ display: 'flex' }}>
                    {(['ongoing', 'completed'] as AppTab[]).map(tab => {
                        const active   = appTab === tab;
                        const isOngoing = tab === 'ongoing';
                        return (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 22px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: active ? 700 : 500,
                                    color: active ? (isOngoing ? '#2563eb' : '#059669') : '#6b7280',
                                    borderBottom: active
                                        ? `2.5px solid ${isOngoing ? '#2563eb' : '#059669'}`
                                        : '2.5px solid transparent',
                                    transition: 'all 0.15s',
                                    marginBottom: '-1px',
                                }}
                            >
                                {isOngoing ? <Clock size={15} /> : <CheckCircle size={15} />}
                                {isOngoing ? 'Ongoing Tasks' : 'Completed Tasks'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── List ───────────────────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                    </div>
                ) : list.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                        <FileText size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No applications found</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>There are no {appTab} applications matching your criteria.</p>
                    </div>
                ) : (
                    <div style={{
                        background: '#fff', borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}>
                        {list.map((app, idx) => {
                            const isHovered = hoveredId === app.id;
                            const isLast    = idx === list.length - 1;
                            return (
                                <div
                                    key={app.id}
                                    onClick={() => handleSelectApplication(app)}
                                    onMouseEnter={() => setHoveredId(app.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '16px 24px', cursor: 'pointer',
                                        background: isHovered ? '#f8fafc' : '#fff',
                                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <FormIcon status={app.current_status} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '15px', fontWeight: 600, color: '#0f172a',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            marginBottom: '4px',
                                        }}>
                                            {app.form_types?.name || 'Application'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '12px' }}>
                                            <CalendarDays size={12} />
                                            <span>Submitted {fmtDate(app.submitted_at)}</span>
                                        </div>
                                    </div>

                                    <StatusBadge status={app.current_status} />

                                    <ChevronRight
                                        size={16}
                                        style={{
                                            color: '#cbd5e1', flexShrink: 0,
                                            transition: 'transform 0.15s',
                                            transform: isHovered ? 'translateX(3px)' : 'none',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AllApplicationsPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>}>
            <AllApplicationsContent />
        </Suspense>
    );
}
