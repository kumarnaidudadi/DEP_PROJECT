'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2, X, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { useFormComments } from '@/hooks/useFormComments';
import { Application } from '@/types';
import ApplicationDetail from '@/components/dashboard/views/ApplicationDetail';
import CommentPanel from '@/components/forms/CommentPanel';

export default function ApplicationDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const appId = Number(params.id);
    const tab = searchParams.get('tab') || 'ongoing';

    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications, makeDecision, triggerDownloadPdf } = useForms();
    const { profile, sigUploading, fetchProfile, handleSigUpload } = useProfile();

    const [remarks, setRemarks] = useState('');
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);

    // Comments count (only fetch when ID is valid)
    const { totalCount: commentCount } = useFormComments(appId || 0);

    useEffect(() => {
        fetchApplications();
        fetchProfile();
    }, [fetchApplications, fetchProfile]);

    const selectedApp = applications.find(a => a.id === appId);
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER = ['STAFF', 'INSTRUCTOR'];
    const canApprove = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER.includes(r));

    const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await makeDecision(selectedApp.id, decision, remarks, approvalData);
            setRemarks('');
            setApprovalData({});
            fetchApplications();
            router.push(`/dashboard/all?tab=${tab}`);
        } catch {
            alert('Failed to update');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadPdf = (id: number, name: string) =>
        triggerDownloadPdf(id, `${name.replace(/\s+/g, '_')}_${id}.pdf`);

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
            </div>
        );
    }

    if (!selectedApp) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '20px' }}>Application not found</p>
                <button
                    onClick={handleBack}
                    style={{
                        padding: '8px 16px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f1f5f9' }}>
            {/* Header with back button */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', background: '#f8fafc' }}>
                <button
                    onClick={handleBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#4b5563',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                    <X size={17} /> Back to All Applications
                </button>

                {/* Comments toggle */}
                <div style={{ marginLeft: 'auto' }}>
                    <button
                        id="comments-toggle-btn"
                        onClick={() => setPanelOpen(o => !o)}
                        title={panelOpen ? 'Hide comments' : 'Show comments'}
                        style={{
                            position: 'relative',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px',
                            background: panelOpen ? '#eef2ff' : '#fff',
                            border: `1px solid ${panelOpen ? '#a5b4fc' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            color: panelOpen ? '#4338ca' : '#4b5563',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            transition: 'all 0.15s',
                            boxShadow: panelOpen ? '0 0 0 2px #c7d2fe' : '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={e => { if (!panelOpen) { e.currentTarget.style.background = '#f1f5f9'; } }}
                        onMouseLeave={e => { if (!panelOpen) { e.currentTarget.style.background = '#fff'; } }}
                    >
                        <MessageSquare size={15} />
                        Comments
                    </button>
                </div>
            </div>

            {/* Detail content */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <ApplicationDetail
                        app={selectedApp}
                        canApprove={canApprove}
                        isInPendingView={false}
                        profile={profile}
                        sigUploading={sigUploading}
                        remarks={remarks}
                        approvalData={approvalData}
                        actionLoading={actionLoading}
                        onRemarks={setRemarks}
                        onApprovalData={setApprovalData}
                        onDecision={handleDecision}
                        onDownloadPdf={handleDownloadPdf}
                        onSigUpload={handleSigUpload}
                    />
                </div>

                {panelOpen && (
                    <div style={{ width: '50%', flexShrink: 0, height: '100%', position: 'sticky', top: 0 }}>
                        <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <CommentPanel
                                formId={appId}
                                currentUserId={user?.id}
                                isAdmin={storedRoles.includes('ADMIN') || storedRoles.includes('SUPER_ADMIN')}
                                onClose={() => setPanelOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
