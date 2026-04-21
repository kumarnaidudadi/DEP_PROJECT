'use client';

import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, MessageSquare, CheckCircle, XCircle
} from 'lucide-react';
import { userAdminService, ReactivationRequest } from '@/services/userAdminService';

export default function ReactivationRequestsPage() {
    const [requests, setRequests] = useState<ReactivationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await userAdminService.getReactivationRequests();
            setRequests(data);
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId: number, status: 'approved' | 'rejected') => {
        const adminNote = window.prompt(`Admin note for ${status}:`, '');
        if (adminNote === null) return;

        setProcessingId(requestId);
        try {
            await userAdminService.processReactivationRequest(requestId, status, adminNote);
            alert(`Request ${status} successfully`);
            fetchRequests();
        } catch (err) {
            alert('Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div style={{ padding: '32px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldAlert size={32} style={{ color: '#f97316' }} />
                    Reactivation Requests
                </h1>
                <p style={{ color: '#64748b', fontSize: '15px' }}>Review and process account reactivation appeals from locked users.</p>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading requests...</div>
            ) : requests.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '64px', height: '64px', background: '#f0fdf4', color: '#16a34a', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>All Caught Up!</h3>
                    <p style={{ color: '#64748b' }}>There are no pending reactivation requests at the moment.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                    {requests.map(req => (
                        <div key={req.id} style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a' }}>{req.users.first_name} {req.users.last_name}</div>
                                    <span style={{ padding: '2px 8px', background: '#fff7ed', color: '#c2410c', fontSize: '11px', fontWeight: 700, borderRadius: '6px', border: '1px solid #ffedd5', textTransform: 'uppercase' }}>PENDING</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>{req.users.email} • Submitted {new Date(req.created_at).toLocaleString()}</div>
                                
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <MessageSquare size={16} style={{ color: '#94a3b8', marginTop: '2px' }} />
                                        <div style={{ fontSize: '14px', color: '#334155', fontStyle: 'italic' }}>
                                            "{req.reason}"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginLeft: '24px' }}>
                                <button 
                                    onClick={() => handleAction(req.id, 'rejected')}
                                    disabled={processingId === req.id}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', 
                                        background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', 
                                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' 
                                    }}
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button 
                                    onClick={() => handleAction(req.id, 'approved')}
                                    disabled={processingId === req.id}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', 
                                        background: '#10b981', color: '#fff', border: 'none', 
                                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' 
                                    }}
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
