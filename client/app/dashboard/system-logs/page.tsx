'use client';
// ─── /dashboard/system-logs ────────────────────────────────────────────────────────────
// System Logs: Clean list view — action, date, user, associated form.
// Only accessible to ADMIN.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import {
    Loader2, Search, FileText,
    CalendarDays, User, Activity, AlertCircle, ChevronDown, Check,
    X, ListTodo, Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import CommentPanel from '@/components/forms/CommentPanel';

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
                const ascHistory = [...historyArr].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
                <div style={{
                    width: selectedFormId ? '400px' : '0',
                    flexShrink: 0,
                    background: '#fff',
                    borderLeft: selectedFormId ? '1px solid #e2e8f0' : 'none',
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: selectedFormId ? 1 : 0,
                }}>
                    {selectedForm && (
                        <>
                            {/* Panel Header */}
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                                            {selectedForm.form_type_name}
                                        </h2>
                                        <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                                            {selectedForm.reference_number || 'NO-REF'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFormId(null)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                                            borderRadius: '6px', color: '#94a3b8', transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#333'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                    <StatusBadge action={selectedForm.latest_action || 'Log'} />
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        {selectedForm.applicant ? `${selectedForm.applicant.first_name} ${selectedForm.applicant.last_name}` : 'Unknown User'}
                                    </span>
                                </div>
                            </div>

                            {/* Panel Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                                <button
                                    onClick={() => setActiveTab('timeline')}
                                    style={{
                                        flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer',
                                        fontSize: '13px', fontWeight: 600, position: 'relative',
                                        color: activeTab === 'timeline' ? '#2563eb' : '#64748b',
                                    }}
                                >
                                    Activity Timeline
                                    {activeTab === 'timeline' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#2563eb' }} />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    style={{
                                        flex: 1, padding: '12px', border: 'none', background: 'none', cursor: 'pointer',
                                        fontSize: '13px', fontWeight: 600, position: 'relative',
                                        color: activeTab === 'comments' ? '#2563eb' : '#64748b',
                                    }}
                                >
                                    Comments
                                    {activeTab === 'comments' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: '#2563eb' }} />}
                                </button>
                            </div>

                            {/* Panel Content Body */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {activeTab === 'timeline' && (
                                    <div style={{ padding: '24px' }}>
                                        {loadingTimeline ? (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={24} className="animate-spin" color="#94a3b8" /></div>
                                        ) : timelineItems.length === 0 ? (
                                            <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>No timeline events found.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                {timelineItems.map((item, index) => {
                                                    const isLast = index === timelineItems.length - 1;
                                                    return (
                                                        <div key={item.id} style={{ display: 'flex', position: 'relative', minHeight: '60px' }}>
                                                            {/* Vertical Line */}
                                                            {!isLast && (
                                                                <div style={{ position: 'absolute', top: '24px', left: '7px', width: '2px', bottom: '-8px', background: '#e2e8f0' }} />
                                                            )}
                                                            {/* Dot */}
                                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#60a5fa', border: '4px solid #fff', marginTop: '4px', flexShrink: 0, zIndex: 1 }} />
                                                            
                                                            <div style={{ marginLeft: '16px', flex: 1, paddingBottom: isLast ? '0' : '20px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <StatusBadge action={item.action} />
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
                                                                        <Clock size={11} /> {fmtDate(item.created_at)}
                                                                    </div>
                                                                </div>
                                                                {item.users && (
                                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginTop: '6px' }}>
                                                                        {item.users.first_name} {item.users.last_name}
                                                                    </div>
                                                                )}
                                                                {item.remarks && (
                                                                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                                                        {item.remarks}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {activeTab === 'comments' && (
                                    <CommentPanel 
                                        formId={selectedFormId} 
                                        currentUserId={user?.id} 
                                        isAdmin={true} 
                                        onClose={() => setSelectedFormId(null)} 
                                    />
                                )}
                            </div>
                        </>
                    )}
                </div>
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

