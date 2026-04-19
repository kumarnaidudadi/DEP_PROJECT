'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2, X, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { useFormComments } from '@/hooks/useFormComments';
import { Application, getApplicationStatus, getLatestForward } from '@/types';
import ApplicationDetail from '@/components/dashboard/views/ApplicationDetail';
import CommentPanel from '@/components/forms/CommentPanel';
import ApprovalTimeline from '@/components/dashboard/WorkflowProgress';

export default function PendingWorkDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const appId = Number(params.id);
    const tab = searchParams.get('tab') || 'needs-review';

    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications, makeDecision, forwardForm, searchUsers, triggerDownloadPdf } = useForms();
    const { profile, sigUploading, fetchProfile, handleSigUpload } = useProfile();

    const [remarks, setRemarks] = useState('');
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');

    // Comment count badge
    const { totalCount: commentCount } = useFormComments(appId || 0);

    useEffect(() => {
        fetchApplications();
        fetchProfile();
    }, [fetchApplications, fetchProfile]);

    const selectedApp = applications.find(a => a.id === appId);
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER = ['STAFF', 'INSTRUCTOR'];
    const isApprovalRole = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER.includes(r));
    
    // Check if the current pending approval is for this user's role
    const latestForward = selectedApp ? getLatestForward(selectedApp) : null;
    const hasPendingApprovalForThisUser = Boolean(
        selectedApp &&
        latestForward?.action === 'forwarded' &&
        Number(latestForward.forwarded_to) === Number(user?.id) &&
        !['APPROVED', 'REJECTED'].includes(getApplicationStatus(selectedApp))
    );
    const canApprove = Boolean(isApprovalRole && hasPendingApprovalForThisUser);

    const handleDecision = async (decision: 'APPROVED' | 'REJECTED', nextApproverId?: number, nextApproverNote?: string) => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await makeDecision(selectedApp.id, decision, remarks, approvalData);
            if (decision === 'APPROVED' && nextApproverId) {
                try {
                    await forwardForm(selectedApp.id, nextApproverId, nextApproverNote);
                } catch (err: any) {
                    const message = err?.response?.data?.error || '';
                    if (!message.includes('finalized')) {
                        throw err;
                    }
                }
            }
            setRemarks('');
            setApprovalData({});
            fetchApplications();
            router.push(`/dashboard/pending?tab=${tab}`);
        } catch {
            alert('Failed to update');
        } finally {
            setActionLoading(false);
        }
    };

    const handleForward = async (toUserId: number, note: string) => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await forwardForm(selectedApp.id, toUserId, note);
            fetchApplications();
        } catch (err) {
            alert('Failed to forward');
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
                    <X size={17} /> Back to Pending Work
                </button>
            </div>
            {/* Detail content */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <ApplicationDetail
                        app={selectedApp}
                        canApprove={canApprove}
                        isInPendingView={true}
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
                        onForward={handleForward}
                        onSearchUsers={searchUsers}
                        onTabSwitch={setActiveTab}
                        onTogglePanel={() => setPanelOpen(o => !o)}
                        activeTab={activeTab}
                        panelOpen={panelOpen}
                        commentCount={commentCount}
                    />
                </div>

                {/* Mobile Backdrop */}
                {panelOpen && (
                    <div 
                        className="md:hidden"
                        onClick={() => setPanelOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
                    />
                )}

                {/* Unified Sidebar Panel */}
                <div 
                    className="md:relative md:w-[360px] min-[1400px]:w-[420px] md:h-auto fixed inset-y-0 right-0 w-[85%] max-w-[420px] z-50 transition-all duration-200 ease-out"
                    style={{ 
                        flexShrink: 0, 
                        transform: panelOpen ? 'translateX(0)' : 'translateX(100%)',
                        opacity: panelOpen ? 1 : 0,
                        visibility: panelOpen ? 'visible' : 'hidden',
                        position: panelOpen ? undefined : 'absolute',
                    }}
                >
                    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        
                        {/* Tabs */}
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e2e8f0', background: '#fff', padding: '0 16px', gap: '4px' }}>
                            <button
                                onClick={() => setActiveTab('timeline')}
                                style={{
                                    padding: '12px 14px', fontSize: '13px', fontWeight: 500,
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    color: activeTab === 'timeline' ? '#0f172a' : '#94a3b8',
                                    borderBottom: activeTab === 'timeline' ? '2px solid #0f172a' : '2px solid transparent',
                                    marginBottom: '-1px', transition: 'all 0.15s'
                                }}
                            >
                                Timeline
                            </button>
                            <button
                                onClick={() => setActiveTab('comments')}
                                style={{
                                    padding: '12px 14px', fontSize: '13px', fontWeight: 500,
                                    border: 'none', background: 'none', cursor: 'pointer',
                                    color: activeTab === 'comments' ? '#4f46e5' : '#94a3b8',
                                    borderBottom: activeTab === 'comments' ? '2px solid #4f46e5' : '2px solid transparent',
                                    marginBottom: '-1px', transition: 'all 0.15s'
                                }}
                            >
                                Comments {commentCount > 0 ? commentCount : ''}
                            </button>
                            <button
                                onClick={() => setPanelOpen(false)}
                                style={{
                                    marginLeft: 'auto', background: 'none', border: 'none',
                                    cursor: 'pointer', color: '#94a3b8', padding: '4px', display: 'flex'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {activeTab === 'timeline' && (
                                <div style={{ padding: '20px' }}>
                                    <ApprovalTimeline
                                        forwards={selectedApp.form_forwards || []}
                                        approvals={selectedApp.form_approvals || []}
                                        currentStatus={selectedApp.current_status}
                                        submittedBy={selectedApp.users}
                                    />
                                </div>
                            )}
                            {activeTab === 'comments' && (
                                <CommentPanel
                                    formId={appId}
                                    currentUserId={user?.id}
                                    isAdmin={storedRoles.includes('ADMIN') || storedRoles.includes('SUPER_ADMIN')}
                                    onClose={() => setPanelOpen(false)}
                                    standalone={false}
                                />
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
