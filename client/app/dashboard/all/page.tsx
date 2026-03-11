'use client';
// ─── /dashboard/all ────────────────────────────────────────────────────────────
// All Applications: Full width grid view with top toggles and modal for details

import React, { useEffect, useState } from 'react';
import { Loader2, Search, X, FileText, CheckCircle, Clock, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { Application, AppTab } from '@/types';
import ApplicationDetail from '@/components/dashboard/views/ApplicationDetail';
import StatusBadge from '@/components/dashboard/StatusBadge';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function AllApplicationsPage() {
    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications, makeDecision, triggerDownloadPdf } = useForms();
    const { profile, sigUploading, fetchProfile, handleSigUpload } = useProfile();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterFormType, setFilterFormType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [appTab, setAppTab] = useState<AppTab>('ongoing');
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [remarks, setRemarks] = useState('');
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { fetchApplications(); fetchProfile(); }, [fetchApplications, fetchProfile]);

    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const canApprove = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER_ROLES.includes(r));
    const isAdmin = storedRoles.includes('ADMIN');

    const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await makeDecision(selectedApp.id, decision, remarks, approvalData);
            setRemarks(''); setApprovalData({}); setSelectedApp(null);
            fetchApplications();
        } catch { alert('Failed to update'); }
        finally { setActionLoading(false); }
    };

    const handleDownloadPdf = (id: number, name: string) => {
        triggerDownloadPdf(id, `${name.replace(/\s+/g, '_')}_${id}.pdf`);
    };

    // Filter apps
    const baseApps = isAdmin ? applications : applications.filter(a => Number(a.submitted_by) === Number(user?.id));
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

    if (filterFormType !== 'all') {
        list = list.filter(a => a.form_types?.name === filterFormType);
    }
    if (filterStatus !== 'all') {
        list = list.filter(a => a.current_status === filterStatus);
    }

    const uniqueFormTypes = Array.from(new Set(baseApps.map(a => a.form_types?.name).filter(Boolean)));
    const uniqueStatuses = Array.from(new Set(baseApps.map(a => a.current_status).filter(Boolean)));

    // Apply sorting
    list.sort((a, b) => {
        const timeA = new Date(a.submitted_at).getTime();
        const timeB = new Date(b.submitted_at).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc' }}>
            {/* Top Navigation & Controls */}
            <div style={{ padding: '24px 32px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0 }}>All Applications</h1>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select 
                                value={filterFormType}
                                onChange={e => setFilterFormType(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '13px', color: '#4b5563', outline: 'none', cursor: 'pointer', maxWidth: '200px', textOverflow: 'ellipsis' }}
                            >
                                <option value="all">All Form Types</option>
                                {uniqueFormTypes.map(ft => (
                                    <option key={ft} value={ft}>{ft}</option>
                                ))}
                            </select>

                            <select 
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '13px', color: '#4b5563', outline: 'none', cursor: 'pointer', textTransform: 'capitalize', maxWidth: '150px', textOverflow: 'ellipsis' }}
                            >
                                <option value="all">All Statuses</option>
                                {uniqueStatuses.map(s => (
                                    <option key={s} value={s}>{s?.replace(/_/g, ' ').toLowerCase()}</option>
                                ))}
                            </select>

                            <select 
                                value={sortOrder}
                                onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: '13px', color: '#4b5563', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>

                        {/* Search Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 16px', width: '250px' }}>
                            <Search size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                                placeholder="Search applications..." 
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#374151', width: '100%' }} 
                            />
                        </div>
                    </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => setAppTab('ongoing')} 
                        style={{ 
                            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                            border: '1px solid', borderColor: appTab === 'ongoing' ? '#3b82f6' : '#e5e7eb',
                            background: appTab === 'ongoing' ? '#eff6ff' : '#fff',
                            color: appTab === 'ongoing' ? '#1d4ed8' : '#6b7280',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Clock size={16} />
                        Ongoing Tasks
                    </button>
                    <button 
                        onClick={() => setAppTab('completed')} 
                        style={{ 
                            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                            border: '1px solid', borderColor: appTab === 'completed' ? '#10b981' : '#e5e7eb',
                            background: appTab === 'completed' ? '#ecfdf5' : '#fff',
                            color: appTab === 'completed' ? '#047857' : '#6b7280',
                            borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <CheckCircle size={16} />
                        Completed Tasks
                    </button>
                </div>
            </div>

            {/* Main Content Area - Grid */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: '#9ca3af' }} />
                    </div>
                ) : list.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        <FileText size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#4b5563', margin: '0 0 8px' }}>No applications found</h2>
                        <p style={{ fontSize: '14px', margin: 0 }}>There are no {appTab} applications matching your criteria.</p>
                    </div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '24px',
                        alignItems: 'stretch'
                    }}>
                        {list.map(app => (
                            <div 
                                key={app.id}
                                onClick={() => setSelectedApp(app)}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    height: '100%',
                                    minHeight: '140px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ marginRight: '16px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {app.form_types?.name || 'Application'}
                                        </h3>
                                        <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>
                                                Submitted: {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <StatusBadge status={app.current_status} />
                                </div>
                                
                                {app.users && (
                                    <div style={{ fontSize: '13px', color: '#4b5563', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Applicant</span>
                                        <span style={{ fontWeight: 500 }}>{app.users.first_name} {app.users.last_name}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Detail Overlay (Modal-like full page view when selected) */}
            {selectedApp && (
                <div style={{ 
                    position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#fff',
                    animation: 'slideIn 0.2s ease-out'
                }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
                        <button 
                            onClick={() => setSelectedApp(null)}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', 
                                color: '#4b5563', cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: '8px 12px',
                                borderRadius: '6px', transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <X size={18} />
                            Back to All Applications
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '24px' }}>
                        <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <ApplicationDetail
                                app={selectedApp} canApprove={canApprove}
                                isInPendingView={false}
                                profile={profile} sigUploading={sigUploading}
                                remarks={remarks} approvalData={approvalData} actionLoading={actionLoading}
                                onRemarks={setRemarks} onApprovalData={setApprovalData}
                                onDecision={handleDecision} onDownloadPdf={handleDownloadPdf}
                                onSigUpload={handleSigUpload}
                            />
                        </div>
                    </div>
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes slideIn {
                            from { transform: translateY(20px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}} />
                </div>
            )}
        </div>
    );
}
