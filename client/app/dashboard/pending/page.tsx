'use client';
// ─── /dashboard/pending ────────────────────────────────────────────────────────
// Pending Work: Own queue only (Needs Review / Previously Processed)
// Acting role queues live at /dashboard/acting-pending/[id]

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Loader2, Search, FileText, Clock, CheckCircle,
    ChevronRight, CalendarDays, ChevronDown, Check,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import api from '@/lib/api';
import { Application, AppTab, getApplicationStatus, getApplicationSubmitterId, getLatestForward } from '@/types';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { UserCheck, X } from 'lucide-react';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

// ── Coloured file icon ─────────────────────────────────────────────────────────
function FormIcon({ status }: { status: string }) {
    const ok = status === 'APPROVED';
    const no = status === 'REJECTED';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : '#fef3c7';
    const c  = ok ? '#16a34a' : no ? '#dc2626' : '#d97706';
    return (
        <div style={{ width: 42, height: 42, borderRadius: '10px', flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={19} style={{ color: c }} />
        </div>
    );
}

// ── Custom dropdown ────────────────────────────────────────────────────────────
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
                    borderRadius: '8px', fontSize: '13px',
                    fontWeight: isFiltered ? 600 : 500,
                    color: isFiltered ? '#1d4ed8' : '#4b5563',
                    cursor: 'pointer', whiteSpace: 'nowrap', minWidth,
                    justifyContent: 'space-between', transition: 'all 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{displayLabel}</span>
                <ChevronDown size={14} style={{ color: isFiltered ? '#1d4ed8' : '#9ca3af', flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)',
                    ...(alignRight ? { right: 0 } : { left: 0 }),
                    zIndex: 999,
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '10px', minWidth: `${minWidth}px`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                    animation: 'dropIn 0.15s ease',
                }}>
                    {options.map(opt => {
                        const active = opt.value === value;
                        return (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                style={{
                                    padding: '9px 16px', cursor: 'pointer', fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    color: active ? '#1d4ed8' : '#374151',
                                    background: active ? '#eff6ff' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    gap: '8px', transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
                                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                                {active && <Check size={13} style={{ color: '#2563eb', flexShrink: 0 }} />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────
// Also used by acting-pending/[id] via prop injection
export function PendingWorkContent({ actingRoleAssignment }: { actingRoleAssignment?: any }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { applications, loading, fetchApplications } = useForms(actingRoleAssignment?.requester_id);
    const { fetchProfile } = useProfile();

    const isActing = !!actingRoleAssignment;
    const accentColor = isActing ? '#7c3aed' : '#2563eb';

    const [searchQuery, setSearchQuery]       = useState('');
    const [filterFormType, setFilterFormType]  = useState<string>('all');
    const [filterStatus, setFilterStatus]      = useState<string>('all');
    const [sortOrder, setSortOrder]            = useState<'desc' | 'asc'>('desc');
    const [appTab, setAppTab]                  = useState<AppTab>((searchParams.get('tab') as AppTab) || 'ongoing');
    const [hoveredId, setHoveredId]            = useState<number | null>(null);
    // Active delegations the current user has SENT (they are the requester)
    const [activeDelegations, setActiveDelegations] = useState<any[]>([]);
    const [revoking, setRevoking]              = useState<number | null>(null);

    const fetchDelegations = async () => {
        try {
            const res = await api.get('/acting-roles/sent');
            const todayStr = new Date().toISOString().slice(0, 10);
            const active = (res.data as any[]).filter(r =>
                r.status === 'accepted' && r.until_date.slice(0, 10) >= todayStr
            );
            setActiveDelegations(active);
        } catch {}
    };

    const handleRevoke = async (id: number) => {
        if (!confirm('Are you sure you want to revoke this acting role? The acting user will immediately lose access.')) return;
        setRevoking(id);
        try {
            await api.post(`/acting-roles/${id}/cancel`);
            await fetchDelegations();
        } catch (e) {
            console.error('Failed to revoke', e);
        } finally {
            setRevoking(null);
        }
    };

    useEffect(() => {
        fetchApplications();
        fetchProfile();
        if (!actingRoleAssignment) {
            api.get('/acting-roles/sent')
                .then(res => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const active = (res.data as any[]).filter(r =>
                        r.status === 'accepted' && r.until_date.slice(0, 10) >= todayStr
                    );
                    setActiveDelegations(active);
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const effectiveUserId = actingRoleAssignment?.requester_id ?? Number(user?.id);

    const handleSelectApplication = (app: Application) => {
        let url = `/dashboard/pending/${app.id}?tab=${appTab}`;
        if (actingRoleAssignment?.id) {
            url += `&actingReqId=${actingRoleAssignment.id}&actingFor=${actingRoleAssignment.requester_id}`;
        }
        router.push(url);
    };

    const handleTabChange = (tab: AppTab) => {
        setAppTab(tab);
        if (!actingRoleAssignment) router.push(`/dashboard/pending?tab=${tab}`);
    };


    // ── Filtering ──────────────────────────────────────────────────────────────
    const pendingApps = applications.filter(a => {
        const status = getApplicationStatus(a);
        const latestForward = getLatestForward(a);
        if (getApplicationSubmitterId(a) === effectiveUserId || isTerminal(status)) return false;
        return latestForward?.action === 'forwarded' && Number(latestForward.forwarded_to) === effectiveUserId;
    });
    const processedApps = applications.filter(a => {
        const status = getApplicationStatus(a);
        if (getApplicationSubmitterId(a) === effectiveUserId) return false;

        // If acting, only show forms processed by THIS specific acting user
        if (isActing) {
            return (a.form_history || []).some((h: any) => 
                Number(h.changed_by) === Number(user?.id) &&
                Number(h.acting_on_behalf_of) === Number(effectiveUserId)
            );
        }

        return (a.form_forwards || []).some((fwd: any) =>
            Number(fwd.forwarded_by) === effectiveUserId &&
            ['approved', 'rejected'].includes(String(fwd.action || '').toLowerCase())
        ) || ((a.form_forwards || []).some((fwd: any) =>
            Number(fwd.forwarded_by) === effectiveUserId &&
            String(fwd.action || '').toLowerCase() === 'forwarded'
        ) && !isTerminal(status));
    });

    let list = appTab === 'ongoing' ? pendingApps : processedApps;

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a =>
            a.form_types?.name.toLowerCase().includes(q) ||
            a.users?.name.toLowerCase().includes(q)
        );
    }
    if (filterFormType !== 'all') list = list.filter(a => a.form_types?.name === filterFormType);
    if (filterStatus !== 'all') list = list.filter(a => getApplicationStatus(a) === filterStatus);

    list.sort((a, b) => {
        const tA = new Date(a.submitted_at).getTime();
        const tB = new Date(b.submitted_at).getTime();
        return sortOrder === 'desc' ? tB - tA : tA - tB;
    });

    const allViewApps = [...pendingApps, ...processedApps];
    const uniqueFormTypes = Array.from(new Set(allViewApps.map(a => a.form_types?.name).filter(Boolean))) as string[];
    const uniqueStatuses  = Array.from(new Set(allViewApps.map(a => getApplicationStatus(a)).filter(Boolean))) as string[];

    const formTypeOptions = [{ value: 'all', label: 'All Form Types' }, ...uniqueFormTypes.map(ft => ({ value: ft, label: ft }))];
    const statusOptions   = [{ value: 'all', label: 'All Statuses'    }, ...uniqueStatuses.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))];
    const sortOptions     = [{ value: 'desc', label: 'Newest First' }, { value: 'asc', label: 'Oldest First' }];

    const fmtDate = (iso: string) =>
        new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>

            {/* ── Active Delegation Notice (shown to the requester on their own Pending Work) ── */}
            {!isActing && activeDelegations.length > 0 && (
                <div style={{
                    padding: '0 32px',
                    background: '#fff',
                    borderBottom: '1px solid #e2e8f0',
                }}>
                    {activeDelegations.map(d => (
                        <div key={d.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '16px',
                            background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
                            border: '1px solid #fde68a',
                            borderRadius: '10px',
                            padding: '12px 18px',
                            margin: '14px 0',
                            fontSize: '13px',
                            color: '#92400e',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <UserCheck size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                                <span>
                                    <strong>Active Delegation:</strong>{' '}
                                    <strong>{d.target_user?.first_name} {d.target_user?.last_name}</strong>{' '}
                                    is currently acting as{' '}
                                    <strong>{d.acting_role}</strong>{' '}
                                    on your behalf.
                                    &nbsp;
                                    <span style={{ color: '#b45309' }}>
                                        Valid until{' '}
                                        {new Date(d.until_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
                                    </span>
                                </span>
                            </div>
                            <button
                                onClick={() => handleRevoke(d.id)}
                                disabled={revoking === d.id}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: revoking === d.id ? '#fde68a' : '#dc2626',
                                    color: revoking === d.id ? '#92400e' : '#fff',
                                    border: 'none', borderRadius: '7px',
                                    padding: '7px 14px', fontSize: '12px', fontWeight: 700,
                                    cursor: revoking === d.id ? 'not-allowed' : 'pointer',
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {revoking === d.id
                                    ? <><Loader2 size={13} className="animate-spin" /> Revoking…</>
                                    : <><X size={13} /> Revoke Access</>
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div style={{ padding: '20px 32px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>

                {/* Acting mode banner */}
                {isActing && (
                    <div style={{
                        background: 'linear-gradient(90deg, #f5f3ff 0%, #ede9fe 100%)',
                        border: '1px solid #ddd6fe', padding: '10px 16px', borderRadius: '8px',
                        marginBottom: '16px', color: '#5b21b6', fontSize: '13px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <Clock size={14} style={{ flexShrink: 0 }} />
                        <span>
                            <strong>Acting Mode</strong> — You are reviewing as{' '}
                            <strong>{actingRoleAssignment.acting_role}</strong>{' '}
                            on behalf of{' '}
                            <strong>
                                {actingRoleAssignment.requester?.first_name}{' '}
                                {actingRoleAssignment.requester?.last_name}
                            </strong>.
                            &nbsp;Valid until{' '}
                            <strong>
                                {new Date(actingRoleAssignment.until_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </strong>.
                            &nbsp;Actions taken here are attributed to you in an acting capacity.
                        </span>
                    </div>
                )}

                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {isActing ? `Acting Pending Work · ${actingRoleAssignment.acting_role}` : 'Pending Work'}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {list.length} {appTab === 'ongoing' ? 'pending' : 'processed'} application{list.length !== 1 ? 's' : ''}
                            {isActing && (
                                <span style={{
                                    marginLeft: '8px', background: '#ede9fe', color: '#7c3aed',
                                    fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px'
                                }}>ACTING</span>
                            )}
                        </p>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', width: '210px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                            <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#374151', width: '100%' }}
                            />
                        </div>
                        <Dropdown label="All Form Types" value={filterFormType} options={formTypeOptions} onChange={setFilterFormType} minWidth={150} />
                        <Dropdown label="All Statuses"   value={filterStatus}   options={statusOptions}   onChange={setFilterStatus}   minWidth={130} />
                        <Dropdown label="Sort"           value={sortOrder}       options={sortOptions}     onChange={v => setSortOrder(v as 'asc' | 'desc')} minWidth={130} alignRight />
                    </div>
                </div>

                {/* Tab pills */}
                <div style={{ display: 'flex' }}>
                    {(['ongoing', 'completed'] as AppTab[]).map(tab => {
                        const active = appTab === tab;
                        const isPending = tab === 'ongoing';
                        const activeCol = isActing ? '#7c3aed' : (isPending ? '#2563eb' : '#059669');
                        return (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '10px 22px', background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: active ? 700 : 500,
                                    color: active ? activeCol : '#6b7280',
                                    borderBottom: active ? `2.5px solid ${activeCol}` : '2.5px solid transparent',
                                    transition: 'all 0.15s', marginBottom: '-1px',
                                }}
                            >
                                {isPending ? <Clock size={15} /> : <CheckCircle size={15} />}
                                {isPending ? 'Needs Review' : 'Previously Processed'}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── List ──────────────────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                    </div>
                ) : list.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                        <FileText size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>All caught up!</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>
                            There are no {appTab === 'ongoing' ? 'pending' : 'processed'} applications.
                        </p>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        {list.map((app, idx) => {
                            const isHovered = hoveredId === app.id;
                            const isLast = idx === list.length - 1;
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
                                        borderLeft: isActing ? `3px solid #7c3aed` : 'none',
                                    }}
                                >
                                    <FormIcon status={getApplicationStatus(app)} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {app.form_types?.name || 'Application'}
                                            {app.reference_number && (
                                                <span style={{ padding: '3px 6px', background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                                    {app.reference_number}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
                                                <CalendarDays size={12} />
                                                <span>Submitted {fmtDate(app.submitted_at)}</span>
                                            </div>
                                            <span style={{ color: '#cbd5e1' }}>•</span>
                                            <span style={{ color: '#6b7280', fontWeight: 500 }}>{app.users?.name}</span>
                                            {app.office_orders?.order_number && (
                                                <>
                                                    <span style={{ color: '#cbd5e1' }}>•</span>
                                                    <span style={{ color: '#2563eb', fontWeight: 600 }}>OO: {app.office_orders.order_number}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <StatusBadge status={getApplicationStatus(app)} />

                                    <ChevronRight size={16} style={{ color: accentColor, flexShrink: 0, opacity: isHovered ? 1 : 0.4, transition: 'opacity 0.15s' }} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes dropIn {
                    from { transform: translateY(-6px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            ` }} />
        </div>
    );
}

export default function PendingWorkPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>}>
            <PendingWorkContent />
        </Suspense>
    );
}
