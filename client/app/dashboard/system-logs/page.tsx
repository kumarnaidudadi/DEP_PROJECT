'use client';
// ─── /dashboard/system-logs ────────────────────────────────────────────────────────────
// System Logs: Clean list view — action, date, user, associated form.
// Only accessible to ADMIN.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import {
    Loader2, Search, FileText,
    CalendarDays, User, Activity, AlertCircle, ChevronDown, Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ── Custom dropdown ───────────────────────────────────────────────────────────
interface DropdownProps {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    minWidth?: number;
    alignRight?: boolean;
}
function Dropdown({ label, value, options, onChange, minWidth = 140, alignRight = false }: DropdownProps) {
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
                    maxHeight: 300, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)',
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

function StatusBadge({ action }: { action: string }) {
    let bg = '#f1f5f9';
    let text = '#64748b';
    const a = (action || '').toLowerCase();

    if (a.includes('create') || a.includes('submit')) {
        bg = '#dbeafe'; text = '#2563eb';
    } else if (a.includes('approve') || a.includes('forward')) {
        bg = '#dcfce7'; text = '#16a34a';
    } else if (a.includes('reject')) {
        bg = '#fee2e2'; text = '#dc2626';
    } else if (a.includes('update') || a.includes('edit')) {
        bg = '#fef9c3'; text = '#ca8a04';
    }

    return (
        <span style={{
            background: bg, color: text,
            padding: '4px 10px', borderRadius: '12px',
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
        }}>
            {action}
        </span>
    );
}

function SystemLogsContent() {
    const { userRoles } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterAction, setFilterAction] = useState('all');
    const [filterFormType, setFilterFormType] = useState('all');
    const [filterUser, setFilterUser] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (userRoles.length > 0 && !userRoles.includes('ADMIN')) {
            router.push('/dashboard');
            return;
        }

        const fetchLogs = async () => {
            try {
                const res = await api.get('/forms/system/logs');
                setLogs(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (userRoles.includes('ADMIN')) {
            fetchLogs();
        }
    }, [userRoles, router]);

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let filtered = logs;

    if (filterAction !== 'all') {
        filtered = filtered.filter(l => (l.action?.toLowerCase() || '') === filterAction.toLowerCase());
    }
    if (filterFormType !== 'all') {
        filtered = filtered.filter(l => l.applied_forms?.form_types?.name === filterFormType);
    }
    if (filterUser !== 'all') {
        filtered = filtered.filter(l => {
            const name = l.users ? `${l.users.first_name} ${l.users.last_name}`.trim() : 'System';
            return name === filterUser;
        });
    }
    if (dateFrom) {
        filtered = filtered.filter(l => new Date(l.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
        const toDt = new Date(dateTo);
        toDt.setHours(23, 59, 59, 999);
        filtered = filtered.filter(l => new Date(l.created_at) <= toDt);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(l =>
            l.action?.toLowerCase().includes(q) ||
            l.remarks?.toLowerCase().includes(q) ||
            l.users?.first_name?.toLowerCase().includes(q) ||
            l.users?.last_name?.toLowerCase().includes(q) ||
            l.applied_forms?.form_types?.name?.toLowerCase().includes(q)
        );
    }

    const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean))) as string[];
    const uniqueFormTypes = Array.from(new Set(logs.map(l => l.applied_forms?.form_types?.name).filter(Boolean))) as string[];
    const uniqueUsers = Array.from(new Set(logs.map(l => l.users ? `${l.users.first_name} ${l.users.last_name}`.trim() : 'System').filter(Boolean))) as string[];

    const actionOptions = [
        { value: 'all', label: 'All Actions' },
        ...uniqueActions.map(a => ({ value: a, label: a.replace(/_/g, ' ') })),
    ];
    const formTypeOptions = [
        { value: 'all', label: 'All Form Types' },
        ...uniqueFormTypes.map(ft => ({ value: ft, label: ft })),
    ];
    const userOptions = [
        { value: 'all', label: 'All Users' },
        ...uniqueUsers.map(u => ({ value: u, label: u })),
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{ padding: '20px 32px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={24} style={{ color: '#3b82f6' }} />
                            System Logs
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {filtered.length} log entr{filtered.length === 1 ? 'y' : 'ies'} found
                        </p>
                    </div>

                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '8px', padding: '8px 14px', width: '250px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                        <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search logs..."
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                fontSize: '13px', color: '#374151', width: '100%',
                            }}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    <Dropdown
                        label="All Actions"
                        value={filterAction}
                        options={actionOptions}
                        onChange={setFilterAction}
                        minWidth={140}
                    />
                    <Dropdown
                        label="All Form Types"
                        value={filterFormType}
                        options={formTypeOptions}
                        onChange={setFilterFormType}
                        minWidth={160}
                    />
                    <Dropdown
                        label="All Users"
                        value={filterUser}
                        options={userOptions}
                        onChange={setFilterUser}
                        minWidth={140}
                    />

                    {/* Date Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', borderLeft: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>From:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginLeft: '4px' }}>To:</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                        {(dateFrom || dateTo || filterAction !== 'all' || filterFormType !== 'all' || filterUser !== 'all') && (
                            <button
                                onClick={() => {
                                    setFilterAction('all');
                                    setFilterFormType('all');
                                    setFilterUser('all');
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                style={{
                                    background: 'none', border: 'none', fontSize: '12px', color: '#ef4444',
                                    cursor: 'pointer', fontWeight: 600, padding: '4px 8px', marginLeft: '4px'
                                }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── List ───────────────────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                        <AlertCircle size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No logs found</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>There are no system logs currently recorded matching your search.</p>
                    </div>
                ) : (
                    <div style={{
                        background: '#fff', borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}>
                        {filtered.map((log, idx) => {
                            const isLast = idx === filtered.length - 1;
                            return (
                                <div
                                    key={log.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '20px',
                                        padding: '16px 24px',
                                        background: '#fff',
                                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                >
                                    {/* Action Icon / Status */}
                                    <div style={{ width: '150px', flexShrink: 0, display: 'flex' }}>
                                        <StatusBadge action={log.action || 'Log'} />
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px', fontWeight: 600, color: '#0f172a',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            marginBottom: '4px',
                                        }}>
                                            {log.remarks || 'No remarks provided'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CalendarDays size={12} />
                                                <span>{fmtDate(log.created_at)}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={12} />
                                                <span>{log.users ? `${log.users.first_name} ${log.users.last_name}` : 'System'}</span>
                                            </div>
                                            {log.applied_forms && (
                                                <>
                                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb' }}>
                                                        <FileText size={12} />
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                                            {log.applied_forms.form_types?.name || 'Unknown Form'}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function SystemLogsPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>}>
            <SystemLogsContent />
        </Suspense>
    );
}

