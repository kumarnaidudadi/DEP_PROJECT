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
import ActivitySidebar from '@/components/dashboard/ActivitySidebar';

export default function PendingWorkDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const appId = Number(params.id);
    const tab = searchParams.get('tab') || 'needs-review';

    const actingFor = searchParams.get('actingFor') ? Number(searchParams.get('actingFor')) : undefined;
    const actingReqId = searchParams.get('actingReqId') ? Number(searchParams.get('actingReqId')) : undefined;

    const { user, userRoles } = useAuth();
    const { applications, loading, fetchApplications, makeDecision, forwardForm, searchUsers, triggerDownloadPdf } = useForms(actingFor);
    const { profile, sigUploading, fetchProfile, handleSigUpload } = useProfile();

    const [remarks, setRemarks] = useState('');
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Comment count badge
    const { totalCount: commentCount } = useFormComments(appId || 0);

    useEffect(() => {
        fetchApplications();
        fetchProfile();
    }, [fetchApplications, fetchProfile]);

    useEffect(() => {
        if (!appId || activeTab !== 'timeline') return;
        let isMounted = true;
        const fetchHistory = async () => {
            setLoadingTimeline(true);
            try {
                const api = (await import('@/lib/api')).default;
                const res = await api.get(`/forms/${appId}/history`);
                const historyArr = res.data.history || [];
                const forwardsArr = res.data.forwards || [];
                
                const merged = historyArr.map((h: any) => {
                    const enriched: any = {
                        ...h,
                        acting_users: h.acting_users ?? null,
                        acting_role_label: h.acting_role_label ?? null,
                    };
                    if (h.action === 'forwarded' || h.action === 'approved' || h.action === 'rejected') {
                        const match = forwardsArr.find((f: any) => 
                            f.action === h.action && 
                            Math.abs(new Date(f.forwarded_at).getTime() - new Date(h.created_at).getTime()) < 5000
                        );
                        if (match?.to_user) {
                            enriched.target_user = match.to_user;
                        }
                    }
                    return enriched;
                });
                
                const ascHistory = [...merged].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (isMounted) setTimelineItems(ascHistory);
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setLoadingTimeline(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, [appId, activeTab]);

    const selectedApp = applications.find(a => a.id === appId);
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const NON_APPROVER = ['STAFF', 'INSTRUCTOR'];
    const nativeIsApprovalRole = storedRoles.length > 0 && !storedRoles.every(r => NON_APPROVER.includes(r));
    // If acting on behalf of someone, the user inherits approval authority from the delegation
    const isApprovalRole = nativeIsApprovalRole || Boolean(actingFor);
    
    // Check if the current pending approval is for this user's role
    const latestForward = selectedApp ? getLatestForward(selectedApp) : null;
    const effectiveUserId = actingFor || Number(user?.id);
    const hasPendingApprovalForThisUser = Boolean(
        selectedApp &&
        latestForward?.action === 'forwarded' &&
        Number(latestForward.forwarded_to) === effectiveUserId &&
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
            let returnUrl = `/dashboard/pending?tab=${tab}`;
            if (actingReqId) returnUrl = `/dashboard/acting-pending/${actingReqId}?tab=${tab}`;
            router.push(returnUrl);
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

    const historyArr = selectedApp.form_history || [];

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
            
            {actingFor && (
                <div style={{ background: '#fef2f2', borderBottom: '1px solid #fca5a5', padding: '10px 24px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                    Acting Mode Active. You are taking actions on behalf of another user.
                </div>
            )}

            {/* Detail content */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#f1f5f9', padding: '24px', display: 'flex', gap: '20px', alignItems: 'stretch', position: 'relative' }}>
                <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
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
                <ActivitySidebar
                    isOpen={panelOpen}
                    onClose={() => setPanelOpen(false)}
                    applicationId={selectedApp.id}
                    referenceId={selectedApp.reference_number || 'NO-REF'}
                    title={selectedApp.form_types?.name || 'Application'}
                    latestAction={historyArr[0]?.action || selectedApp.current_status}
                    applicantName={selectedApp.users ? `${selectedApp.users.first_name} ${selectedApp.users.last_name}` : 'Unknown User'}
                    loadingTimeline={loadingTimeline}
                    timelineData={timelineItems}
                    currentUserId={user?.id}
                    isAdmin={storedRoles.includes('ADMIN') || storedRoles.includes('SUPER_ADMIN')}
                />
            </div>
        </div>
    );
}
