'use client';
// ─── /dashboard/all ────────────────────────────────────────────────────────────
// All Applications: list (middle panel) + detail (right panel)

import React, { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { Application, AppTab } from '@/types';
import AllApplicationsView from '@/components/dashboard/views/AllApplicationsView';
import ApplicationDetail from '@/components/dashboard/views/ApplicationDetail';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function AllApplicationsPage() {
    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications, makeDecision, triggerDownloadPdf } = useForms();
    const { profile, sigUploading, fetchProfile, handleSigUpload } = useProfile();

    const [searchQuery, setSearchQuery] = useState('');
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

    return (
        <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            {/* Middle Panel */}
            <div style={{ width: '280px', minWidth: '280px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>All Applications</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px' }}>
                        <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: '#374151', width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        {(['ongoing', 'completed'] as AppTab[]).map(tab => (
                            <button key={tab} onClick={() => setAppTab(tab)} style={{ flex: 1, padding: '7px 14px', border: 'none', background: appTab === tab ? '#2563eb' : '#f3f4f6', color: appTab === tab ? '#fff' : '#6b7280', fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', textTransform: 'capitalize' }}>
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" style={{ color: '#9ca3af' }} /></div>}
                    {!loading && (
                        <AllApplicationsView
                            applications={applications} selectedApp={selectedApp}
                            appTab={appTab} searchQuery={searchQuery} isAdmin={isAdmin}
                            userId={user?.id} onSelect={setSelectedApp}
                        />
                    )}
                </div>
            </div>

            {/* Right Panel */}
            <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                {!selectedApp && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        Select an application to view details
                    </div>
                )}
                {selectedApp && (
                    <ApplicationDetail
                        app={selectedApp} canApprove={canApprove}
                        isInPendingView={false}
                        profile={profile} sigUploading={sigUploading}
                        remarks={remarks} approvalData={approvalData} actionLoading={actionLoading}
                        onRemarks={setRemarks} onApprovalData={setApprovalData}
                        onDecision={handleDecision} onDownloadPdf={handleDownloadPdf}
                        onSigUpload={handleSigUpload}
                    />
                )}
            </main>
        </div>
    );
}
