'use client';
// ─── /dashboard/system-logs ────────────────────────────────────────────────────────────
// System Logs: Clean list view — action, date, user, associated form.
// Only accessible to ADMIN.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { FileText, ArrowRight, Clock, Plus, Loader2, RefreshCw, X, ListTodo, Search, CalendarDays, User, Activity, AlertCircle, ChevronDown, Check, Globe } from 'lucide-react';
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
    const [searchUser, setSearchUser] = useState('');
    const [searchIp, setSearchIp] = useState('');
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

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

    if (searchUser) {
        const q = searchUser.toLowerCase();
        filtered = filtered.filter(l =>
            l.applicant?.first_name?.toLowerCase().includes(q) ||
            l.applicant?.last_name?.toLowerCase().includes(q)
        );
    }
    
    if (searchIp) {
        filtered = filtered.filter(l => (l.last_ip || '').includes(searchIp));
    }

    const suggestions = searchUser ? Array.from(new Set(
        filtered.map(l => {
            const q = searchUser.toLowerCase();
            const name = l.applicant ? `${l.applicant.first_name} ${l.applicant.last_name}`.trim() : 'System';
            if (name.toLowerCase().includes(q)) return name;
            return null;
        }).filter(Boolean)
    )).slice(0, 8) as string[] : [];

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

    const selectedForm = logs.find(l => l.form_id === selectedFormId);


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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 14px', width: '220px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <Globe size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                value={searchIp}
                                onChange={e => setSearchIp(e.target.value)}
                                placeholder="Search IP address..."
                                style={{
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '13px', color: '#374151', width: '100%',
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '8px 14px', width: '250px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}>
                                <User size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                <input
                                    value={searchUser}
                                    onChange={e => { setSearchUser(e.target.value); setSearchDropdownOpen(true); }}
                                    onFocus={() => setSearchDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}
                                    placeholder="Search User or Email..."
                                    style={{
                                        border: 'none', outline: 'none', background: 'transparent',
                                        fontSize: '13px', color: '#374151', width: '100%',
                                    }}
                                />
                            </div>
                            {searchDropdownOpen && suggestions.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {suggestions.map((s, i) => (
                                        <div 
                                            key={i}
                                            onClick={() => { setSearchUser(s); setSearchDropdownOpen(false); }}
                                            style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#1e293b' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                        >
                                            {s}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
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
                            background: '#fff',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            overflow: 'hidden',
                        }}>
                            <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Ref No.</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Applicant</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Last Action By</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Date &amp; Time</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>IP Address</th>
                                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>COMMENTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((log, index) => {
                                            const isActive = selectedFormId === log.form_id;
                                            const applicantName = log.applicant ? `${log.applicant.first_name} ${log.applicant.last_name}`.trim() : 'Unknown';
                                            const actorName = log.last_actor ? `${log.last_actor.first_name} ${log.last_actor.last_name}`.trim() : 'System';
                                            
                                            const dateObj = new Date(log.last_updated);
                                            const compactDate = `${dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

                                            return (
                                                <tr
                                                    key={log.id}
                                                    onClick={() => { setSelectedFormId(log.form_id); setActiveTab('timeline'); }}
                                                    style={{
                                                        background: isActive ? '#eff6ff' : (index % 2 === 1 ? '#f8fafc' : '#ffffff'),
                                                        transition: 'all 0.15s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f1f5f9'; }}
                                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = (index % 2 === 1 ? '#f8fafc' : '#ffffff'); }}
                                                >
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <span style={{
                                                            background: '#f1f5f9', color: '#475569', fontFamily: 'monospace',
                                                            fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                                                            border: '1px solid #e2e8f0'
                                                        }}>
                                                            {log.reference_number || 'NO-REF'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                                            {log.form_type_name}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <StatusBadge action={log.latest_action || 'Log'} />
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                                                            {applicantName}
                                                            {log.applicant?.emp_code && (
                                                                <span style={{ marginLeft: '6px', color: '#94a3b8', fontSize: '11px', fontWeight: 400 }}>
                                                                    ({log.applicant.emp_code})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '13px', color: '#475569' }}>
                                                            {actorName}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                            {compactDate}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                                        {log.last_ip ? (
                                                            <span style={{
                                                                fontFamily: 'monospace', fontSize: '11px',
                                                                background: '#f1f5f9', color: '#475569',
                                                                padding: '2px 7px', borderRadius: '4px',
                                                                border: '1px solid #e2e8f0', whiteSpace: 'nowrap',
                                                            }}>
                                                                {log.last_ip}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#cbd5e1' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                                        {log.comment_count > 0 ? (
                                                            <div style={{ 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '4px', 
                                                                background: '#eff6ff', 
                                                                color: '#2563eb', 
                                                                padding: '2px 8px', 
                                                                borderRadius: '6px', 
                                                                fontSize: '12px', 
                                                                fontWeight: 600 
                                                            }}>
                                                                💬 {log.comment_count}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#cbd5e1' }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
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
                    latestAction={selectedForm?.status || 'Log'}
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

