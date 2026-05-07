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
import ActivitySidebar from '@/components/dashboard/ActivitySidebar';

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
    const [panelOpen, setPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');
    const [timelineItems, setTimelineItems] = useState<any[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Comments count (only fetch when ID is valid)
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
                    if (h.action === 'forwarded' || h.action === 'approved' || h.action === 'rejected') {
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
                    <X size={17} /> Back to All Applications
                </button>
            </div>

            {/* Detail content */}
            <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}>
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
