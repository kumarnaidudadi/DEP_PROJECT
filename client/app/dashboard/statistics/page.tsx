'use client';
// ─── /dashboard/statistics ────────────────────────────────────────────────────────────
// Rich, filterable analytics dashboard for administrators.
// Matches exact UI patterns of System Logs.

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { 
    BarChart2, Search, CalendarDays, User, Activity, AlertCircle, 
    ChevronDown, Check, Loader2, RefreshCw, X, ShieldAlert,
    Clock, Smartphone, Globe, Mail, Briefcase, Calendar, Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ── Custom Dropdown (Matches System Logs) ───────────────────────────────────
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

// ── Stat Card Component ─────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = '#3b82f6' }: { label: string; value: string | number; icon: React.ReactNode, color?: string }) {
    return (
        <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '10px',
                background: `${color}15`, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{value}</div>
            </div>
        </div>
    );
}

// ── Statistics Content ───────────────────────────────────────────────────────
function StatisticsContent() {
    const { userRoles } = useAuth();
    const router = useRouter();
    
    // Filters State
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [singleDate, setSingleDate] = useState('');
    const [timeFrom, setTimeFrom] = useState('');
    const [timeTo, setTimeTo] = useState('');
    const [filterUser, setFilterUser] = useState('all');
    const [filterIp, setFilterIp] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);

    // Data State
    const [refreshTick, setRefreshTick] = useState(0);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'general' | 'user' | 'ip'>('general');

    useEffect(() => {
        if (userRoles.length > 0 && !userRoles.includes('ADMIN')) {
            router.push('/dashboard');
            return;
        }

        const loadInitialData = async () => {
            try {
                const [usersRes, statsRes] = await Promise.all([
                    api.get('/statistics/users'),
                    api.get('/statistics/general')
                ]);
                setUsers(usersRes.data);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to load statistics data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (userRoles.includes('ADMIN')) {
            loadInitialData();
        }
    }, [userRoles, router]);

    // Apply filters whenever they change
    useEffect(() => {
        if (!userRoles.includes('ADMIN')) return;
        
        const fetchStats = async () => {
            setLoading(true);
            try {
                let endpoint = '/statistics/general';
                const params: any = {};
                
                if (dateFrom) params.dateFrom = dateFrom;
                if (dateTo) params.dateTo = dateTo;
                if (singleDate) params.singleDate = singleDate;
                if (timeFrom) params.timeFrom = timeFrom;
                if (timeTo) params.timeTo = timeTo;

                if (filterIp) {
                    endpoint = '/statistics/ip';
                    params.ipAddress = filterIp;
                    setViewMode('ip');
                } else if (filterUser !== 'all') {
                    endpoint = `/statistics/user/${filterUser}`;
                    setViewMode('user');
                } else {
                    setViewMode('general');
                }

                const res = await api.get(endpoint, { params });
                setStats(res.data);
            } catch (err) {
                console.error('Failed to apply filters:', err);
            } finally {
                setLoading(false);
            }
        };
        
        const delayDebounceFn = setTimeout(() => {
            fetchStats();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [dateFrom, dateTo, singleDate, timeFrom, timeTo, filterUser, filterIp, userRoles, refreshTick]);

    const handleReset = () => {
        setDateFrom('');
        setDateTo('');
        setSingleDate('');
        setTimeFrom('');
        setTimeTo('');
        setFilterUser('all');
        setFilterIp('');
        setUserSearch('');
    };

    const userOptions = [
        { value: 'all', label: 'All Users' },
        ...users.map(u => ({ value: u.id.toString(), label: u.name })),
    ];

    const fmtDate = (iso: string) => {
        if (!iso) return 'N/A';
        return new Date(iso).toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        });
    };

    const formatHour = (h: number | null) => {
        if (h === null) return 'N/A';
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:00 ${period}`;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{ padding: '20px 32px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart2 size={24} style={{ color: '#3b82f6' }} />
                            Statistics
                            <button 
                                onClick={() => { setLoading(true); setRefreshTick(t => t + 1); }} 
                                style={{ 
                                    background: 'none', border: 'none', cursor: 'pointer', 
                                    color: '#64748b', display: 'flex', alignItems: 'center', 
                                    padding: '4px', marginLeft: '4px', borderRadius: '4px', transition: 'background 0.2s' 
                                }} 
                                title="Refresh Statistics"
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                                <RefreshCw size={16} />
                            </button>
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {viewMode === 'general' ? 'Platform wide statistics' : viewMode === 'user' ? 'User specific statistics' : 'IP specific statistics'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Export Button */}
                        <button
                            onClick={() => {
                                if (!stats) return;
                                let csv = '';
                                if (viewMode === 'general') {
                                    csv += 'PLATFORM WIDE STATISTICS REPORT\n\n';
                                    csv += '--- Summary Metrics ---\n';
                                    csv += 'Metric,Value\n';
                                    csv += `Total Submitted Forms,${stats.totalSubmitted || 0}\n`;
                                    csv += `Total Approved,${stats.totalApproved || 0}\n`;
                                    csv += `Total Rejected,${stats.totalRejected || 0}\n`;
                                    csv += `Total Forwarded,${stats.totalForwarded || 0}\n`;
                                    csv += `New Users Registered,${stats.totalNewUsers || 0}\n`;
                                    csv += `Distinct Users Logged In,${stats.totalLoggedIn || 0}\n`;
                                    csv += `Peak Activity Hour,${stats.peakHour !== null ? stats.peakHour + ':00 (' + stats.peakCount + ' actions)' : 'N/A'}\n\n`;

                                    csv += '--- Status Breakdown ---\n';
                                    csv += 'Status,Count\n';
                                    stats.statusBreakdown?.forEach((s: any) => csv += `${s.status},${s.count}\n`);
                                    csv += '\n';

                                    csv += '--- Daily Activity Breakdown ---\n';
                                    csv += 'Date,Actions Count\n';
                                    stats.dailyBreakdown?.forEach((d: any) => csv += `${d.date},${d.count}\n`);

                                } else if (viewMode === 'user') {
                                    csv += 'USER STATISTICS REPORT\n\n';
                                    csv += '--- User Details ---\n';
                                    csv += `Name,${stats.user?.name || ''}\n`;
                                    csv += `Email,${stats.user?.email || ''}\n`;
                                    csv += `Roles,${stats.user?.roles?.join('; ') || ''}\n`;
                                    csv += `Joined At,${stats.user?.joinedAt || ''}\n`;
                                    csv += `Account Status,${stats.user?.isActive ? 'Active' : 'Inactive'}\n\n`;

                                    csv += '--- Summary Metrics ---\n';
                                    csv += `Submitted,${stats.submitted || 0}\n`;
                                    csv += `Approved,${stats.approved || 0}\n`;
                                    csv += `Rejected,${stats.rejected || 0}\n`;
                                    csv += `Forwarded,${stats.forwarded || 0}\n`;
                                    csv += `Last Activity,${stats.lastActivity || 'N/A'}\n\n`;

                                    csv += '--- Action Groups ---\n';
                                    csv += 'Action,Count\n';
                                    stats.actionGroups?.forEach((g: any) => csv += `${g.action},${g.count}\n`);
                                    csv += '\n';

                                    csv += '--- Detailed Activity Timeline ---\n';
                                    csv += 'Action,Form Type,Form Ref,Date,Status\n';
                                    stats.timeline?.forEach((t: any) => csv += `${t.action},${t.formType || ''},${t.formRef || ''},${t.date},${t.formStatus || ''}\n`);

                                } else if (viewMode === 'ip') {
                                    csv += 'IP ADDRESS STATISTICS REPORT\n\n';
                                    csv += '--- IP Details ---\n';
                                    csv += `IP Address,${stats.ipAddress || ''}\n`;
                                    csv += `First Seen,${stats.firstSeen || ''}\n`;
                                    csv += `Last Seen,${stats.lastSeen || ''}\n`;
                                    csv += `Multiple Users Flag,${stats.multipleUsers ? 'Yes' : 'No'}\n`;
                                    csv += `Security Warning,${stats.securityWarning ? 'Active' : 'None'}\n\n`;

                                    csv += '--- Summary Metrics ---\n';
                                    csv += `Total Actions,${stats.totalActions || 0}\n`;
                                    csv += `Successful Submissions,${stats.successfulActions || 0}\n`;
                                    csv += `Forwarded Actions,${stats.forwardedActions || 0}\n`;
                                    csv += `Approved Actions,${stats.approvedActions || 0}\n`;
                                    csv += `Rejected Actions,${stats.rejectedActions || 0}\n\n`;

                                    csv += '--- Distinct Users from this IP ---\n';
                                    csv += 'Name,Email\n';
                                    stats.distinctUsers?.forEach((u: any) => csv += `${u.name},${u.email}\n`);
                                    csv += '\n';

                                    csv += '--- Daily Activity Breakdown ---\n';
                                    csv += 'Date,Count\n';
                                    stats.dailyBreakdown?.forEach((d: any) => csv += `${d.date},${d.count}\n`);
                                    csv += '\n';

                                    csv += '--- Recent Actions (Last 20) ---\n';
                                    csv += 'Action,User,Form Ref,Form Type,Date\n';
                                    stats.recentActions?.forEach((a: any) => csv += `${a.action},${a.user},${a.formRef || ''},${a.formType || ''},${a.date}\n`);
                                }
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `statistics_export_${new Date().toISOString().split('T')[0]}.csv`;
                                a.click();
                            }}
                            style={{
                                padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export CSV
                        </button>

                        {/* IP Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '8px', padding: '8px 14px', width: '220px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                        <Globe size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <input
                            value={filterIp}
                            onChange={e => { setFilterIp(e.target.value); if(e.target.value) { setFilterUser('all'); setUserSearchQuery(''); } }}
                            placeholder="Search IP address..."
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                fontSize: '13px', color: '#374151', width: '100%',
                            }}
                        />
                    </div>

                        {/* User Autocomplete */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 14px', width: '220px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <User size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                value={userSearch}
                                onChange={e => { setUserSearch(e.target.value); setUserDropdownOpen(true); }}
                                onFocus={() => setUserDropdownOpen(true)}
                                onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                                placeholder="Search User or Email..."
                                style={{
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '13px', color: '#374151', width: '100%',
                                }}
                            />
                        </div>
                        {userDropdownOpen && userSearch && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                    <div 
                                        key={u.id}
                                        onClick={() => { setFilterUser(u.id.toString()); setUserSearch(u.name); setFilterIp(''); setUserDropdownOpen(false); }}
                                        style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#1e293b' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                                    </div>
                                ))}
                                {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                                    <div style={{ padding: '8px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No users found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

                {/* Filters matching System Logs exactly */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    

                    {/* Date Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', borderLeft: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>From:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setSingleDate(''); }}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginLeft: '4px' }}>To:</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setSingleDate(''); }}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', borderLeft: '1px solid #e2e8f0' }}>
                         <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Single Date:</span>
                         <input
                            type="date"
                            value={singleDate}
                            onChange={(e) => { setSingleDate(e.target.value); setDateFrom(''); setDateTo(''); }}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', borderLeft: '1px solid #e2e8f0' }}>
                         <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Time:</span>
                         <input
                            type="time"
                            value={timeFrom}
                            onChange={(e) => setTimeFrom(e.target.value)}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginLeft: '2px' }}>-</span>
                        <input
                            type="time"
                            value={timeTo}
                            onChange={(e) => setTimeTo(e.target.value)}
                            style={{
                                padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                fontSize: '12px', color: '#374151', outline: 'none'
                            }}
                        />
                    </div>

                    {(dateFrom || dateTo || singleDate || timeFrom || timeTo || filterUser !== 'all' || filterIp || userSearch) && (
                        <button
                            onClick={handleReset}
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

            {/* ── Main Content Area ───────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px' }}>
                    {loading && !stats ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                        </div>
                    ) : !stats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                            <AlertCircle size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No stats found</p>
                            <p style={{ fontSize: '13px', margin: 0 }}>Try adjusting your filters.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            
                            {/* 1. VIEW Mode: GENERAL */}
                            {viewMode === 'general' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                        <StatCard label="Total Submissions" value={stats.totalSubmitted} icon={<Smartphone size={20} />} color="#3b82f6" />
                                        <StatCard label="Apps Approved" value={stats.totalApproved} icon={<Check size={20} />} color="#10b981" />
                                        <StatCard label="Apps Rejected/Ret" value={stats.totalRejected} icon={<X size={20} />} color="#ef4444" />
                                        <StatCard label="Apps Forwarded" value={stats.totalForwarded} icon={<RefreshCw size={20} />} color="#f59e0b" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                        <StatCard label="User Logins" value={stats.totalLoggedIn} icon={<User size={20} />} color="#8b5cf6" />
                                        <StatCard label="New Registrations" value={stats.totalNewUsers} icon={<Mail size={20} />} color="#ec4899" />
                                        <StatCard label="Peak Activity Hour" value={formatHour(stats.peakHour)} icon={<Clock size={20} />} color="#64748b" />
                                        <StatCard label="Peak Hour Volume" value={stats.peakCount} icon={<Activity size={20} />} color="#06b6d4" />
                                    </div>

                                    {/* Activity Summary matching table style card */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                                        <div style={{ 
                                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{singleDate ? 'Activity Volume by Hour' : 'Activity Volume by Day'}</h3>
                                            </div>
                                            <div style={{ height: '260px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '20px' }}>
                                                {stats.dailyBreakdown?.length > 0 ? (
                                                    stats.dailyBreakdown.map((d: any) => {
                                                        const maxCount = Math.max(...stats.dailyBreakdown.map((x: any) => x.count), 1);
                                                        const height = (d.count / maxCount) * 100;
                                                        return (
                                                            <div 
                                                                key={d.date} 
                                                                onClick={() => {
                                                                    if (!d.isHourly) {
                                                                        setSingleDate(d.date); setDateFrom(''); setDateTo('');
                                                                    }
                                                                }}
                                                                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', height: '100%', cursor: d.isHourly ? 'default' : 'pointer' }}
                                                                onMouseEnter={e => {
                                                                    if (!d.isHourly) {
                                                                        const bar = e.currentTarget.children[0] as HTMLElement;
                                                                        bar.style.background = '#2563eb';
                                                                    }
                                                                }}
                                                                onMouseLeave={e => {
                                                                    if (!d.isHourly) {
                                                                        const bar = e.currentTarget.children[0] as HTMLElement;
                                                                        bar.style.background = '#3b82f6';
                                                                    }
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    width: '100%', height: `${height}%`, background: '#3b82f6', 
                                                                    borderRadius: '4px 4px 0 0', position: 'relative',
                                                                    transition: 'background 0.2s'
                                                                }} title={`${d.date}: ${d.count} actions`}>
                                                                </div>
                                                                <div style={{ fontSize: '10px', color: '#64748b', transform: 'rotate(-45deg)', marginTop: '12px', whiteSpace: 'nowrap' }}>
                                                                    {d.isHourly ? d.date : new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                                        No activity recorded
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{ 
                                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Status Distribution</h3>
                                            </div>
                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {stats.statusBreakdown?.map((s: any) => (
                                                    <div key={s.status} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                                                            <span style={{ textTransform: 'capitalize' }}>{s.status.replace(/_/g, ' ')}</span>
                                                            <span>{s.count}</span>
                                                        </div>
                                                        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ 
                                                                height: '100%', 
                                                                width: `${(s.count / Math.max(stats.totalSubmitted, 1)) * 100}%`,
                                                                background: s.status === 'approved' ? '#10b981' : s.status === 'rejected' ? '#ef4444' : '#3b82f6'
                                                            }} />
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!stats.statusBreakdown || stats.statusBreakdown.length === 0) && (
                                                    <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0', fontSize: '13px' }}>No data</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 2. VIEW Mode: USER */}
                            {viewMode === 'user' && stats.user && (
                                <>
                                    <div style={{ 
                                        background: '#fff', borderRadius: '12px', padding: '24px', 
                                        border: '1px solid #e2e8f0', display: 'flex', gap: '24px', alignItems: 'center',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{ 
                                            width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', 
                                            color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '24px', fontWeight: 800
                                        }}>
                                            {stats.user.name.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stats.user.name}</h2>
                                            <div style={{ display: 'flex', gap: '20px', marginTop: '8px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {stats.user.email}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> {stats.user.roles?.join(', ')}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Activity size={14} /> Status: 
                                                    <span style={{ color: stats.user.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                        {stats.user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Last Active</div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{fmtDate(stats.lastActivity)}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                        <StatCard label="Submitted" value={stats.submitted} icon={<Smartphone size={20} />} color="#3b82f6" />
                                        <StatCard label="Forwarded" value={stats.forwarded} icon={<RefreshCw size={20} />} color="#f59e0b" />
                                        <StatCard label="Approved" value={stats.approved} icon={<Check size={20} />} color="#10b981" />
                                        <StatCard label="Rejected" value={stats.rejected} icon={<X size={20} />} color="#ef4444" />
                                    </div>

                                    <div style={{ 
                                        background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', overflow: 'hidden'
                                    }}>
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Recent Actions Timeline</h3>
                                        </div>
                                        <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                                        <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Form</th>
                                                        <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>Date & Time</th>
                                                        <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stats.timeline?.map((t: any, idx: number) => (
                                                        <tr key={idx} style={{ background: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>
                                                                {t.action}
                                                            </td>
                                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#1e293b' }}>
                                                                <span style={{ fontWeight: 600 }}>{t.formType}</span> 
                                                                <span style={{ background: '#f1f5f9', color: '#475569', fontFamily: 'monospace', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', marginLeft: '8px' }}>
                                                                    {t.formRef || 'NO-REF'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b' }}>
                                                                {fmtDate(t.date)}
                                                            </td>
                                                            <td style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                                                <span style={{ 
                                                                    fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px',
                                                                    background: t.formStatus === 'approved' ? '#ecfdf5' : t.formStatus === 'rejected' ? '#fef2f2' : '#eff6ff',
                                                                    color: t.formStatus === 'approved' ? '#059669' : t.formStatus === 'rejected' ? '#dc2626' : '#2563eb',
                                                                    border: `1px solid ${t.formStatus === 'approved' ? '#a7f3d0' : t.formStatus === 'rejected' ? '#fecaca' : '#bfdbfe'}`
                                                                }}>
                                                                    {t.formStatus?.toUpperCase() || 'UNKNOWN'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!stats.timeline || stats.timeline.length === 0) && (
                                                        <tr>
                                                            <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No recent activity found</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 3. VIEW Mode: IP */}
                            {viewMode === 'ip' && (
                                <>
                                    <div style={{ 
                                        background: '#fff', borderRadius: '12px', padding: '24px', 
                                        border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                    }}>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ 
                                                width: '56px', height: '56px', borderRadius: '12px', background: stats.securityWarning ? '#fef2f2' : '#f0f9ff', 
                                                color: stats.securityWarning ? '#ef4444' : '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Globe size={28} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Monitoring IP Address</div>
                                                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>{stats.ipAddress}</h2>
                                            </div>
                                        </div>
                                        
                                        {stats.securityWarning && (
                                            <div style={{ 
                                                padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c'
                                            }}>
                                                <ShieldAlert size={20} />
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>Security Warning</div>
                                                    <div style={{ fontSize: '12px', fontWeight: 500 }}>Multiple users associated with this IP</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                        <StatCard label="Total Requests" value={stats.totalActions} icon={<Activity size={20} />} color="#3b82f6" />
                                        <StatCard label="Distinct Users" value={stats.distinctUsers?.length || 0} icon={<Users size={20} />} color="#8b5cf6" />
                                        <StatCard label="Successful Logins" value={stats.successfulActions} icon={<Check size={20} />} color="#10b981" />
                                        <StatCard label="First Seen" value={stats.firstSeen ? new Date(stats.firstSeen).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'} icon={<Calendar size={20} />} color="#64748b" />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <div style={{ 
                                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Users on this IP</h3>
                                            </div>
                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {stats.distinctUsers?.map((u: any) => (
                                                    <div key={u.id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{u.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                                                    </div>
                                                ))}
                                                {(!stats.distinctUsers || stats.distinctUsers.length === 0) && (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No users found</div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div style={{ 
                                            background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Recent Activity</h3>
                                            </div>
                                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {stats.recentActions?.slice(0, 10).map((a: any, idx: number) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>{a.action.toUpperCase()}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>by <span style={{color: '#1e293b', fontWeight: 500}}>{a.user}</span></div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                                                <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>#{a.formRef || 'NO-REF'}</span>
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{new Date(a.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!stats.recentActions || stats.recentActions.length === 0) && (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No recent activity</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <style jsx global>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default function StatisticsPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>}>
            <StatisticsContent />
        </Suspense>
    );
}
