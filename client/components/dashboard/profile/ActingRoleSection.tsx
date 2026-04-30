'use client';

import React, { useState, useEffect } from 'react';
import { User, Calendar, Shield, X, Check, Search, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface UserItem {
    id: number;
    name: string;
    email: string;
    roles?: string[];
}

export default function ActingRoleSection({ currentUser }: { currentUser: any }) {
    const [sentRequests, setSentRequests] = useState<any[]>([]);
    const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
    
    const [users, setUsers] = useState<UserItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    const [targetUserId, setTargetUserId] = useState<number | null>(null);
    const [actingRole, setActingRole] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [untilDate, setUntilDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [activeTab, setActiveTab] = useState<'request' | 'received'>('request');

    // Only approver roles can delegate their own work to an acting user
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const userRoleList: string[] = (currentUser?.roles || []).map((r: string) => r.toUpperCase());
    const nativeCanDelegate = userRoleList.length > 0 && !userRoleList.every(r => NON_APPROVER_ROLES.includes(r));

    useEffect(() => {
        if (!currentUser) return;
        
        // Robust role detection: check roles array then fallback to designation or 'User'
        const roleSource = currentUser.roles?.[0] || currentUser.designation || 'User';
        const defaultRole = `Acting ${roleSource}`;
        setActingRole(defaultRole);

        // Non-approvers default to the Requests Received tab
        if (!nativeCanDelegate) setActiveTab('received');
        
        fetchData();
        fetchUsers();
    }, [currentUser]);

    const fetchData = async () => {
        try {
            const [sent, received] = await Promise.all([
                api.get('/acting-roles/sent'),
                api.get('/acting-roles/received')
            ]);
            setSentRequests(sent.data);
            setReceivedRequests(received.data);
        } catch (err) {
            console.error('Failed to load acting roles', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/statistics/users');
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers([]);
            return;
        }
        const q = searchQuery.toLowerCase();
        setFilteredUsers(users.filter(u => 
            u.id !== currentUser?.id && 
            (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        ).slice(0, 5));
    }, [searchQuery, users, currentUser]);

    const handleSendRequest = async () => {
        if (!targetUserId) {
            setError('Please select a user from the search results.');
            return;
        }
        if (!actingRole) {
            setError('Acting role label is missing. Please refresh.');
            return;
        }
        if (!fromDate || !untilDate) {
            setError('Please select both From and Until dates.');
            return;
        }
        
        setLoading(true);
        setError('');
        try {
            await api.post('/acting-roles/request', { targetUserId, actingRole, fromDate, untilDate });
            setTargetUserId(null);
            setSearchQuery('');
            setFromDate('');
            setUntilDate('');
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send request');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRequest = async (id: number) => {
        try {
            await api.post(`/acting-roles/${id}/cancel`);
            await fetchData();
        } catch (err) {
            console.error('Failed to cancel', err);
        }
    };

    const handleRespondRequest = async (id: number, action: 'accept' | 'reject') => {
        try {
            await api.post(`/acting-roles/${id}/${action}`);
            await fetchData();
        } catch (err) {
            console.error(`Failed to ${action}`, err);
        }
    };

    const handleWithdrawRequest = async (id: number) => {
        if (!confirm('Are you sure you want to withdraw from this acting role? You will no longer be able to act on behalf of this user.')) return;
        try {
            await api.post(`/acting-roles/${id}/withdraw`);
            await fetchData();
        } catch (err) {
            console.error('Failed to withdraw', err);
        }
    };

    const activeOrPendingSent = sentRequests.find(r => ['pending', 'accepted'].includes(r.status));

    return (
        <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                {/* Assign Acting Role tab — only for native approvers */}
                {nativeCanDelegate && (
                    <button 
                        onClick={() => setActiveTab('request')}
                        style={{ 
                            background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
                            borderBottom: activeTab === 'request' ? '2px solid #3b82f6' : '2px solid transparent',
                            color: activeTab === 'request' ? '#3b82f6' : '#64748b', fontWeight: 600, fontSize: '14px'
                        }}
                    >
                        Assign Acting Role
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('received')}
                    style={{ 
                        background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
                        borderBottom: activeTab === 'received' ? '2px solid #3b82f6' : '2px solid transparent',
                        color: activeTab === 'received' ? '#3b82f6' : '#64748b', fontWeight: 600, fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    Requests Received 
                    {receivedRequests.filter(r => r.status === 'pending').length > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '2px 8px', fontSize: '11px' }}>
                            {receivedRequests.filter(r => r.status === 'pending').length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'request' && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', color: '#0f172a' }}>
                    
                    {error && (
                        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {activeOrPendingSent ? (
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }}>Current Assignment</h3>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                                        {activeOrPendingSent.target_user?.first_name} {activeOrPendingSent.target_user?.last_name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={14} /> {activeOrPendingSent.acting_role}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {new Date(activeOrPendingSent.from_date).toLocaleDateString()} &rarr; {new Date(activeOrPendingSent.until_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span style={{ 
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                        background: activeOrPendingSent.status === 'pending' ? '#fef3c7' : '#dcfce3',
                                        color: activeOrPendingSent.status === 'pending' ? '#d97706' : '#16a34a'
                                    }}>
                                        {activeOrPendingSent.status.toUpperCase()}
                                    </span>
                                    <button 
                                        onClick={() => handleCancelRequest(activeOrPendingSent.id)}
                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        {activeOrPendingSent.status === 'pending' ? 'Cancel Request' : 'Revoke'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px', color: '#0f172a' }}>Assign New Acting Role</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Assign To</label>
                                    <div style={{ 
                                        display: 'flex', alignItems: 'center', 
                                        border: targetUserId ? '1px solid #16a34a' : '1px solid #cbd5e1', 
                                        borderRadius: '8px', padding: '0 12px', background: targetUserId ? '#f0fdf4' : '#fff',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <Search size={16} color={targetUserId ? '#16a34a' : '#94a3b8'} />
                                        <input 
                                            value={searchQuery}
                                            onChange={e => { setSearchQuery(e.target.value); setTargetUserId(null); setDropdownOpen(true); }}
                                            onFocus={() => setDropdownOpen(true)}
                                            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                                            placeholder="Search user by name or email"
                                            style={{ border: 'none', outline: 'none', padding: '10px', width: '100%', fontSize: '14px', color: '#0f172a', background: 'transparent' }}
                                        />
                                        {targetUserId && <Check size={16} color="#16a34a" style={{ marginLeft: '8px' }} />}
                                    </div>
                                    {dropdownOpen && filteredUsers.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                            {filteredUsers.map(u => (
                                                <div 
                                                    key={u.id}
                                                    onClick={() => {
                                                        setTargetUserId(u.id);
                                                        setSearchQuery(`${u.name} (${u.email})`);
                                                        setDropdownOpen(false);
                                                    }}
                                                    style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{u.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Acting Role Label</label>
                                    <input 
                                        value={actingRole}
                                        readOnly
                                        placeholder="e.g. Acting HOD"
                                        style={{ 
                                            border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', width: '100%', 
                                            fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                            background: '#f8fafc', color: '#0f172a', cursor: 'not-allowed'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>From Date</label>
                                    <input 
                                        type="date"
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', width: '100%', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Until Date</label>
                                    <input 
                                        type="date"
                                        value={untilDate}
                                        onChange={e => setUntilDate(e.target.value)}
                                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', width: '100%', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={handleSendRequest}
                                    disabled={loading || !targetUserId}
                                    style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading || !targetUserId ? 'not-allowed' : 'pointer', opacity: loading || !targetUserId ? 0.7 : 1 }}
                                >
                                    {loading ? 'Sending...' : 'Send Request'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'received' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {receivedRequests.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            No acting role requests received.
                        </div>
                    ) : (
                        receivedRequests.map(r => (
                            <div key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                                        {r.acting_role}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                                        Requested by: <span style={{ fontWeight: 600 }}>{r.requester?.first_name} {r.requester?.last_name}</span> ({r.requester?.email})
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} /> {new Date(r.from_date).toLocaleDateString()} &rarr; {new Date(r.until_date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {r.status === 'pending' ? (
                                        <>
                                            <button 
                                                onClick={() => handleRespondRequest(r.id, 'accept')}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                <Check size={16} /> Accept
                                            </button>
                                            <button 
                                                onClick={() => handleRespondRequest(r.id, 'reject')}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                <X size={16} /> Reject
                                            </button>
                                        </>
                                    ) : (
                                        <span style={{ 
                                            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                            background: r.status === 'accepted' ? '#dcfce3' : r.status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                                            color: r.status === 'accepted' ? '#16a34a' : r.status === 'rejected' ? '#ef4444' : '#64748b'
                                        }}>
                                            {r.status.toUpperCase()}
                                        </span>
                                    )}
                                    {r.status === 'accepted' && (
                                        <button 
                                            onClick={() => handleWithdrawRequest(r.id)}
                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: '8px' }}
                                        >
                                            Withdraw
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
