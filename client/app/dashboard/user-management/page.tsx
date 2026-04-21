'use client';

import React, { useState, useEffect } from 'react';
import { 
    Users, UserPlus, Upload, Download, Search
} from 'lucide-react';
import { userAdminService, InactiveUser } from '@/services/userAdminService';
import api from '@/lib/api';

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<'list' | 'add' | 'bulk'>('list');
    const [users, setUsers] = useState<InactiveUser[]>([]);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('inactive');
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
        joining_date: '',
        auth_provider: 'local'
    });

    // Bulk upload states
    const [file, setFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<{added: number, failed: any[]} | null>(null);

    // Departments for dropdown
    const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/profile/departments');
            setDepartments(res.data || []);
        } catch (err) {
            console.error('Failed to load departments', err);
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
                department_id: '', joining_date: '', auth_provider: 'local'
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
        <div className="space-y-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Search by name, email, code..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ 
                                padding: '10px 12px 10px 40px', borderRadius: '10px', border: '1px solid #e2e8f0',
                                width: '300px', fontSize: '14px'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '2px' }}>
                        {(['all', 'active', 'inactive'] as const).map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                style={{ 
                                    padding: '6px 12px', fontSize: '12px', fontWeight: 600, border: 'none',
                                    borderRadius: '8px', cursor: 'pointer',
                                    background: filter === f ? '#3b82f6' : 'transparent',
                                    color: filter === f ? '#fff' : '#64748b',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <button 
                    onClick={() => userAdminService.downloadTemplate()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-sm font-medium"
                >
                    <Download size={16} /> Template
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading user data...</div>
            ) : filteredUsers.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
                    <Users size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
                    <div style={{ color: '#64748b', fontWeight: 500 }}>No users found matching your criteria.</div>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>User</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Details</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Last Activity Log</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{user.first_name} {user.last_name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                            background: user.is_active ? '#f0fdf4' : '#fef2f2',
                                            color: user.is_active ? '#16a34a' : '#ef4444',
                                            border: `1px solid ${user.is_active ? '#bbf7d0' : '#fee2e2'}`
                                        }}>
                                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontSize: '13px', color: '#334155' }}>{user.emp_code || '---'}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {user.user_activity_logs?.[0] ? (
                                            <>
                                                <div style={{ fontSize: '13px', color: user.is_active ? '#475569' : '#ef4444', fontWeight: 500 }}>{user.user_activity_logs[0].reason}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    {user.user_activity_logs[0].action} by {user.user_activity_logs[0].triggered_by} • {new Date(user.user_activity_logs[0].created_at).toLocaleDateString()}
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>---</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                                            style={{ 
                                                padding: '6px 12px', 
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
            )}
        </div>
    );

    const renderAdd = () => (
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '24px' }}>Create New User</h2>
            <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>First Name *</label>
                    <input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Last Name *</label>
                    <input type="text" required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Address *</label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Password *</label>
                    <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Employee Code</label>
                    <input type="text" value={formData.emp_code} onChange={e => setFormData({...formData, emp_code: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Department <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                    <select 
                        value={formData.department_id} 
                        onChange={e => setFormData({...formData, department_id: e.target.value})}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '14px', color: formData.department_id ? '#0f172a' : '#94a3b8' }}
                    >
                        <option value="">-- No Department --</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Joining Date <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                    <input type="date" value={formData.joining_date} onChange={e => setFormData({...formData, joining_date: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
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
    );

    const renderBulk = () => (
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
    );

    return (
        <div style={{ padding: '32px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>User Management</h1>
                <p style={{ color: '#64748b', fontSize: '15px' }}>Manage user accounts, bulk onboarding, and security status.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '4px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '32px', width: 'fit-content' }}>
                <button 
                    onClick={() => setActiveTab('list')}
                    style={{ 
                        padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none',
                        background: activeTab === 'list' ? '#fff' : 'transparent',
                        color: activeTab === 'list' ? '#3b82f6' : '#6b7280',
                        boxShadow: activeTab === 'list' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <span className="flex items-center gap-2"><Users size={16}/> User Directory</span>
                </button>
                <button 
                    onClick={() => setActiveTab('add')}
                    style={{ 
                        padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none',
                        background: activeTab === 'add' ? '#fff' : 'transparent',
                        color: activeTab === 'add' ? '#3b82f6' : '#6b7280',
                        boxShadow: activeTab === 'add' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <span className="flex items-center gap-2"><UserPlus size={16}/> Add User</span>
                </button>
                <button 
                    onClick={() => setActiveTab('bulk')}
                    style={{ 
                        padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, border: 'none',
                        background: activeTab === 'bulk' ? '#fff' : 'transparent',
                        color: activeTab === 'bulk' ? '#3b82f6' : '#6b7280',
                        boxShadow: activeTab === 'bulk' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    <span className="flex items-center gap-2"><Upload size={16}/> Bulk Upload</span>
                </button>
            </div>

            {/* Content */}
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                {activeTab === 'list' && renderList()}
                {activeTab === 'add' && renderAdd()}
                {activeTab === 'bulk' && renderBulk()}
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
        </div>
    );
}
