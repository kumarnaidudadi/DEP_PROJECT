'use client';

import React, { useState } from 'react';
import { ShieldX, Send, CheckCircle, LogOut } from 'lucide-react';
import { userAdminService } from '@/services/userAdminService';
import { useAuth } from '@/hooks/useAuth';

export default function InactiveWallPage() {
    const { logout } = useAuth();
    const [reason, setReason] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await userAdminService.submitReactivationRequest(reason);
            setSubmitted(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' }}>
            <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '32px', padding: '40px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                {!submitted ? (
                    <>
                        <div style={{ width: '80px', height: '80px', background: '#fef2f2', color: '#ef4444', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <ShieldX size={40} />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Account Inactive</h1>
                        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                            Your account is currently inactive. This may be due to multiple failed login attempts or an administrative action.
                        </p>

                        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Reason for Reactivation
                            </label>
                            <textarea 
                                required
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Please explain why your account should be reactivated..."
                                style={{ 
                                    width: '100%', height: '120px', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                    fontSize: '14px', marginBottom: '24px', resize: 'none'
                                }}
                            />
                            <button 
                                type="submit"
                                disabled={loading}
                                style={{ 
                                    width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', 
                                    borderRadius: '16px', border: 'none', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? 'Submitting...' : <><Send size={18} /> Submit Request</>}
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ animation: 'scaleUp 0.4s ease-out' }}>
                        <div style={{ width: '80px', height: '80px', background: '#f0fdf4', color: '#10b981', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle size={40} />
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Request Submitted</h1>
                        <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                            Your reactivation request has been sent to the administrators. You will be notified once it has been reviewed.
                        </p>
                    </div>
                )}

                <button 
                    onClick={logout}
                    style={{ 
                        marginTop: '24px', background: 'none', border: 'none', color: '#94a3b8', 
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', gap: '6px', margin: '24px auto 0' 
                    }}
                >
                    <LogOut size={14} /> Sign out of account
                </button>
            </div>
        </div>
    );
}
