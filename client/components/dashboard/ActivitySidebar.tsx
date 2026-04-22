import React, { useState } from 'react';
import { X, Clock, Loader2 } from 'lucide-react';
import StatusBadge from '@/components/dashboard/StatusBadge';
import CommentPanel from '@/components/forms/CommentPanel';

interface TimelineEvent {
    id: string | number;
    action: string;
    created_at: string | Date;
    users?: {
        first_name?: string;
        last_name?: string;
        user_roles?: Array<{ roles?: { name: string } }>;
    };
    target_user?: {
        first_name?: string;
        last_name?: string;
        user_roles?: Array<{ roles?: { name: string } }>;
    };
    remarks?: string;
}

interface ActivitySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    // Header properties
    applicationId: number;
    referenceId: string;
    title: string;
    latestAction?: string;
    applicantName?: string;
    
    // Timeline Data
    loadingTimeline?: boolean;
    timelineData: TimelineEvent[];
    
    // Comment Data Configuration
    currentUserId?: number;
    isAdmin?: boolean;
}

export default function ActivitySidebar({
    isOpen,
    onClose,
    applicationId,
    referenceId,
    title,
    latestAction,
    applicantName,
    loadingTimeline = false,
    timelineData,
    currentUserId,
    isAdmin = false
}: ActivitySidebarProps) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'comments'>('timeline');

    const fmtDate = (val: string | Date) => {
        const d = new Date(val);
        return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getPrimaryRole = (user: any) => {
        if (!user || !user.user_roles || user.user_roles.length === 0) return null;
        const roles = user.user_roles.map((ur: any) => ur.roles?.name).filter(Boolean);
        if (roles.includes('ADMIN')) return 'Admin';
        if (roles.includes('DIRECTOR')) return 'Director';
        if (roles.includes('DEAN')) return 'Dean';
        if (roles.includes('HEAD_OF_DEPARTMENT') || roles.includes('HOD')) return 'HOD';
        if (roles.includes('ESTABLISHMENT')) return 'Establishment';
        return roles[0] ? roles[0].replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase()) : null;
    };

    return (
        <div style={{
            width: isOpen ? '400px' : '0',
            flexShrink: 0,
            background: '#fff',
            borderLeft: isOpen ? '1px solid #e2e8f0' : 'none',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: isOpen ? 1 : 0,
        }}>
            {isOpen && (
                <>
                    {/* Panel Header */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
                                    {title}
                                </h2>
                                <div style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                                    {referenceId || 'NO-REF'}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
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
                            <StatusBadge action={latestAction || 'Log'} />
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                {applicantName || 'Unknown User'}
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
                                ) : timelineData.length === 0 ? (
                                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>No timeline events found.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {timelineData.map((item, index) => {
                                            const isLast = index === timelineData.length - 1;
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
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#333', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>{item.users.first_name} {item.users.last_name}</span>
                                                                {getPrimaryRole(item.users) && (
                                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                                        {getPrimaryRole(item.users)}
                                                                    </span>
                                                                )}
                                                                {item.target_user && (
                                                                    <>
                                                                        <span style={{ fontSize: '11px', color: '#94a3b8', margin: '0 2px', fontWeight: 500 }}>→</span>
                                                                        <span>{item.target_user.first_name} {item.target_user.last_name}</span>
                                                                        {getPrimaryRole(item.target_user) && (
                                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                                                {getPrimaryRole(item.target_user)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                )}
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
                                formId={applicationId} 
                                currentUserId={currentUserId} 
                                isAdmin={isAdmin} 
                                onClose={onClose} 
                                standalone={false}
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
