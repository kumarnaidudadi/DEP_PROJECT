'use client';
// ─── /dashboard/system-logs ────────────────────────────────────────────────────────────
// System Logs: Clean list view — action, date, user, associated form.
// Only accessible to ADMIN.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { FileText, ArrowRight, Clock, Plus, Loader2, RefreshCw, X, ListTodo, Search, CalendarDays, User, Activity, AlertCircle, ChevronDown, Check } from 'lucide-react';
import StatusBadge from '@/components/dashboard/StatusBadge';
import ActivitySidebar from '@/components/dashboard/ActivitySidebar';
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



function SystemLogsContent() {
    const { userRoles, user } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [filterAction, setFilterAction] = useState('all');
    const [filterFormType, setFilterFormType] = useState('all');
    const [filterUser, setFilterUser] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

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

    useEffect(() => {
        if (!selectedFormId || activeTab !== 'timeline') return;
        const fetchHistory = async () => {
            setLoadingTimeline(true);
            try {
                const res = await api.get(`/forms/${selectedFormId}/history`);
                const historyArr = res.data.history || [];
                const forwardsArr = res.data.forwards || [];
                
                const merged = historyArr.map((h: any) => {
                    if (h.action === 'forwarded' || h.action === 'approved' || h.action === 'rejected') {
                        // find matching forward by action and approximate time
                        const match = forwardsArr.find((f: any) => 
                            f.action === h.action && 
                            Math.abs(new Date(f.forwarded_at).getTime() - new Date(h.created_at).getTime()) < 5000
                        );
                        if (match && match.to_user) {
                            return { ...h, target_user: match.to_user };
                        }
                    }
                    return h;
                });
                
                const ascHistory = [...merged].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                setTimelineItems(ascHistory);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingTimeline(false);
            }
        };
        fetchHistory();
    }, [selectedFormId, activeTab]);

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let filtered = logs;

    if (filterAction !== 'all') {
        filtered = filtered.filter(l => (l.latest_action?.toLowerCase() || '') === filterAction.toLowerCase());
    }
    if (filterFormType !== 'all') {
        filtered = filtered.filter(l => l.form_type_name === filterFormType);
    }
    if (filterUser !== 'all') {
        filtered = filtered.filter(l => {
            const name = l.applicant ? `${l.applicant.first_name} ${l.applicant.last_name}`.trim() : 'System';
            return name === filterUser;
        });
    }
    if (dateFrom) {
        filtered = filtered.filter(l => new Date(l.last_updated) >= new Date(dateFrom));
    }
    if (dateTo) {
        const toDt = new Date(dateTo);
        toDt.setHours(23, 59, 59, 999);
        filtered = filtered.filter(l => new Date(l.last_updated) <= toDt);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(l =>
            l.latest_action?.toLowerCase().includes(q) ||
            l.form_type_name?.toLowerCase().includes(q) ||
            (l.reference_number || '').toLowerCase().includes(q) ||
            l.applicant?.first_name?.toLowerCase().includes(q) ||
            l.applicant?.last_name?.toLowerCase().includes(q)
        );
    }

    const uniqueActions = Array.from(new Set(logs.map(l => l.latest_action).filter(Boolean))) as string[];
    const uniqueFormTypes = Array.from(new Set(logs.map(l => l.form_type_name).filter(Boolean))) as string[];
    const uniqueUsers = Array.from(new Set(logs.map(l => l.applicant ? `${l.applicant.first_name} ${l.applicant.last_name}`.trim() : 'System').filter(Boolean))) as string[];

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

    const selectedForm = logs.find(l => l.id === selectedFormId);

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

            {/* ── Main Content Area ───────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px' }}>
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
                            display: 'flex', flexDirection: 'column', gap: '10px'
                        }}>
                            {filtered.map((log) => {
                                const isActive = selectedFormId === log.id;
                                const applicantName = log.applicant ? `${log.applicant.first_name} ${log.applicant.last_name}`.trim() : 'Unknown User';
                                const actorName = log.last_actor ? `${log.last_actor.first_name} ${log.last_actor.last_name}`.trim() : 'System';

                                return (
                                    <div
                                        key={log.id}
                                        onClick={() => { setSelectedFormId(log.id); setActiveTab('timeline'); }}
                                        style={{
                                            border: `1px solid ${isActive ? '#bfdbfe' : '#e2e8f0'}`,
                                            borderLeft: isActive ? '3px solid #3b82f6' : '1px solid #e2e8f0',
                                            background: isActive ? '#eff6ff' : '#fff',
                                            borderRadius: '12px',
                                            padding: '16px 20px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isActive ? '0 4px 6px -1px rgba(0,0,0,0.05)' : '0 1px 2px rgba(0,0,0,0.02)',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)'; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <StatusBadge action={log.latest_action || 'Log'} />
                                                <span style={{
                                                    background: '#f1f5f9', color: '#475569', fontFamily: 'monospace',
                                                    fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 600
                                                }}>
                                                    {log.reference_number || 'NO-REF'}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                                {log.form_type_name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                {fmtDate(log.last_updated)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                                            <div>
                                                Applicant: <strong style={{ color: '#475569' }}>{applicantName}</strong> {log.applicant?.emp_code ? `(${log.applicant.emp_code})` : ''} · Last by: <strong style={{ color: '#475569' }}>{actorName}</strong>
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ListTodo size={14} /> {log.activity_count} actions
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    💬 {log.comment_count} comments
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>

                {/* ── Detail Panel (Slide-in) ───────────────────────────────────────────────────────── */}
                <ActivitySidebar
                    isOpen={!!selectedFormId}
                    onClose={() => setSelectedFormId(null)}
                    applicationId={selectedFormId as number}
                    referenceId={selectedForm?.reference_number || 'NO-REF'}
                    title={selectedForm?.form_type_name || ''}
                    latestAction={selectedForm?.latest_action || 'Log'}
                    applicantName={selectedForm?.applicant ? `${selectedForm.applicant.first_name} ${selectedForm.applicant.last_name}` : 'Unknown User'}
                    loadingTimeline={loadingTimeline}
                    timelineData={timelineItems}
                    currentUserId={user?.id}
                    isAdmin={true}
                />
            </div>
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

