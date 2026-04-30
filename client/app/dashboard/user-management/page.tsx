'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Users, UserPlus, Upload, Download, Search, Activity, AlertCircle, Loader2
} from 'lucide-react';
import { userAdminService, InactiveUser } from '@/services/userAdminService';
import api from '@/lib/api';
import StatusBadge from '@/components/dashboard/StatusBadge';

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [users, setUsers] = useState<InactiveUser[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    useEffect(() => {
        // Read initial state from URL on mount
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as 'list' | 'add' | 'bulk';
        const filterParam = params.get('filter') as 'all' | 'active' | 'inactive';

        if (tabParam && ['list', 'add', 'bulk'].includes(tabParam)) setActiveTab(tabParam);
        if (filterParam && ['all', 'active', 'inactive'].includes(filterParam)) setFilter(filterParam);
    }, []);

    // Sync state to URL when changed
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        params.set('tab', activeTab);
        params.set('filter', filter);
        window.history.replaceState(null, '', `?${params.toString()}`);
    }, [activeTab, filter]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Toast notification
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Form states
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        emp_code: '',
        department_id: '',
        role_id: '',
        joining_date: '',
        auth_provider: 'local'
    });

    // Bulk upload states
    const [file, setFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<{ added: number, failed: any[] } | null>(null);

    // Departments for dropdown
    const [departments, setDepartments] = useState<{ id: number, name: string }[]>([]);
    const [roles, setRoles] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
        fetchRoles();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/profile/departments');
            setDepartments(res.data || []);
        } catch (err) {
            console.error('Failed to load departments', err);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/profile/roles');
            setRoles(res.data || []);
        } catch (err) {
            console.error('Failed to load roles', err);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userAdminService.getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            await userAdminService.addUser(formData);
            showToast('User account created successfully');
            setFormData({
                first_name: '', middle_name: '', last_name: '',
                email: '', password: '', emp_code: '',
                department_id: '', role_id: '', joining_date: '', auth_provider: 'local'
            });
            fetchUsers();
            setActiveTab('list');
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to add user', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!file) return;
        setProcessing(true);
        try {
            const result = await userAdminService.bulkUpload(file);
            setUploadResult(result);
            if (result.failed.length > 0) {
                showToast(`${result.added} added, ${result.failed.length} failed`, 'error');
            } else {
                showToast(`${result.added} users added successfully`);
            }
            fetchUsers();
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to upload file', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleStatus = async (userId: number, currentActive: boolean) => {
        const action = currentActive ? 'DEACTIVATE' : 'ACTIVATE';
        const reason = window.prompt(`Reason for ${action}:`, '');
        if (reason === null) return;

        try {
            await userAdminService.toggleUserStatus(userId, !currentActive, reason || 'Admin action');
            showToast(`User ${currentActive ? 'deactivated' : 'activated'} successfully`);
            fetchUsers();
        } catch (err) {
            showToast('Failed to update user status', 'error');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesFilter = filter === 'all' || (filter === 'active' ? u.is_active : !u.is_active);
        const matchesSearch = (u.first_name + ' ' + u.last_name + ' ' + u.email + ' ' + (u.emp_code || '')).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const renderList = () => (
        <div style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            overflow: 'hidden',
        }}>
            <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                        <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>User</th>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Email</th>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Employee ID</th>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Last Activity</th>
                            <th style={{ padding: '14px 20px', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user, index) => (
                            <tr
                                key={user.id}
                                style={{
                                    background: index % 2 === 1 ? '#f8fafc' : '#ffffff',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = (index % 2 === 1 ? '#f8fafc' : '#ffffff')}
                            >
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                        {user.first_name} {user.last_name}
                                    </div>
                                </td>
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '13px', color: '#475569' }}>
                                        {user.email}
                                    </div>
                                </td>
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '13px', color: '#475569' }}>
                                        {user.emp_code || '---'}
                                    </div>
                                </td>
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <StatusBadge status={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
                                </td>
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    {user.user_activity_logs?.[0] ? (
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            <span style={{ fontWeight: 500, color: user.is_active ? '#475569' : '#dc2626' }}>{user.user_activity_logs[0].reason}</span>
                                            <div style={{ fontSize: '11px', opacity: 0.8 }}>
                                                {user.user_activity_logs[0].action} • {new Date(user.user_activity_logs[0].created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#cbd5e1', fontSize: '12px' }}>---</span>
                                    )}
                                </td>
                                <td style={{ padding: '10px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                                        style={{
                                            padding: '4px 12px',
                                            background: user.is_active ? '#fef2f2' : '#f0fdf4',
                                            color: user.is_active ? '#ef4444' : '#16a34a',
                                            border: `1px solid ${user.is_active ? '#fee2e2' : '#bbf7d0'}`,
                                            borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {user.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderAdd = () => (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setActiveTab('list')}
                style={{ position: 'absolute', top: '-70px', left: '0', background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
                ← Back to User Directory
            </button>
            <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>Create New User</h2>
                <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>First Name *</label>
                        <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Last Name *</label>
                        <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Address *</label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                        <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Employee Code</label>
                        <input type="text" value={formData.emp_code} onChange={e => setFormData({ ...formData, emp_code: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Department <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                        <select
                            value={formData.department_id}
                            onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', color: formData.department_id ? '#0f172a' : '#94a3b8' }}
                        >
                            <option value="">-- No Department --</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Designation / Role *</label>
                        <select
                            required
                            value={formData.role_id}
                            onChange={e => setFormData({ ...formData, role_id: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', color: formData.role_id ? '#0f172a' : '#94a3b8' }}
                        >
                            <option value="">-- Select Role --</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Joining Date <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                        <input type="date" value={formData.joining_date} onChange={e => setFormData({ ...formData, joining_date: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2', marginTop: '12px' }}>
                        <button
                            type="submit" disabled={processing}
                            style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {processing ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const renderBulk = () => (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setActiveTab('list')}
                style={{ position: 'absolute', top: '-70px', left: '0', background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
                ← Back to User Directory
            </button>
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '48px 32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <div style={{ width: '64px', height: '64px', background: '#eff6ff', color: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Upload size={32} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Bulk User Upload</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>Upload an Excel file (.xlsx) containing user profiles to create them in bulk.</p>

                    <div style={{ border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '32px', position: 'relative', cursor: 'pointer', background: file ? '#f0f9ff' : 'transparent', transition: 'all 0.2s' }} onDragOver={e => e.preventDefault()}>
                        <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files?.[0] || null)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                        <div style={{ color: '#1e293b', fontWeight: 500 }}>{file ? file.name : 'Click to select or drag and drop Excel file'}</div>
                        {!file && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Supported formats: .xlsx</div>}
                    </div>

                    {uploadResult && (
                        <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: '#10b981' }}>✓ Success: {uploadResult.added} users created</div>
                            {uploadResult.failed.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#ef4444' }}>⚠ Failed: {uploadResult.failed.length}</div>
                                    <ul style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', paddingLeft: '20px' }}>
                                        {uploadResult.failed.slice(0, 5).map((f, i) => (
                                            <li key={i}>{f.row?.email || 'Unknown row'}: {f.reason}</li>
                                        ))}
                                        {uploadResult.failed.length > 5 && <li>... and {uploadResult.failed.length - 5} more</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                        <button
                            onClick={() => userAdminService.downloadTemplate()}
                            style={{ flex: 1, padding: '12px', background: '#f8fafc', color: '#475569', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Download Template
                        </button>
                        <button
                            onClick={handleBulkUpload} disabled={!file || processing}
                            style={{ flex: 1, padding: '12px', background: !file ? '#94a3b8' : '#3b82f6', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 600, cursor: file ? 'pointer' : 'not-allowed' }}
                        >
                            {processing ? 'Uploading...' : 'Start Upload'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
            {/* Header / Action Bar */}
            <div style={{ padding: '20px 32px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={24} style={{ color: '#3b82f6' }} />
                            User Management
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'} managed
                        </p>
                    </div>

                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '8px', padding: '8px 14px', width: '250px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                        <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            style={{
                                border: 'none', outline: 'none', background: 'transparent',
                                fontSize: '13px', color: '#374151', width: '100%',
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        {(['all', 'active', 'inactive'] as const).map(f => {
                            const active = filter === f;
                            const label = f === 'all' ? 'All Users' : f === 'active' ? 'Active Users' : 'Inactive Users';
                            const color = active ? '#3b82f6' : '#64748b';

                            return (
                                <button
                                    key={f}
                                    onClick={() => {
                                        setFilter(f);
                                        setActiveTab('list');
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 4px',
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: active ? 700 : 500,
                                        color,
                                        borderBottom: active ? `2.5px solid ${color}` : '2.5px solid transparent',
                                        transition: 'all 0.15s',
                                        marginBottom: '-1px',
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px' }}>
                        <button
                            onClick={() => userAdminService.downloadTemplate()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 500, color: '#4b5563', cursor: 'pointer',
                                transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                        >
                            <Download size={14} /> Download Template
                        </button>
                        <button
                            onClick={() => setActiveTab('bulk')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 14px', background: '#fff', border: '1px solid #3b82f6', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 600, color: '#3b82f6', cursor: 'pointer',
                                transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                        >
                            <Upload size={14} /> Bulk Upload
                        </button>
                        <button
                            onClick={() => setActiveTab('add')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer',
                                transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                        >
                            <UserPlus size={14} /> Add User
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 32px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                            <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                        </div>
                    ) : filteredUsers.length === 0 && activeTab === 'list' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                            <AlertCircle size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No users found</p>
                            <p style={{ fontSize: '13px', margin: 0 }}>There are no users  .</p>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                            {activeTab === 'list' && renderList()}
                            {activeTab === 'add' && renderAdd()}
                            {activeTab === 'bulk' && renderBulk()}
                        </div>
                    )}
                </main>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '14px 20px', borderRadius: '14px',
                    background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
                    color: toast.type === 'success' ? '#15803d' : '#dc2626',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    fontWeight: 600, fontSize: '14px',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <span style={{ fontSize: '18px' }}>{toast.type === 'success' ? '✓' : '✕'}</span>
                    {toast.message}
                </div>
            )}

            <style jsx global>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
