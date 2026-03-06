'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    FilePlus, FileText, Clock, CheckCircle, XCircle, LogOut,
    ChevronRight, Loader2, Send, ClipboardList, AlertCircle, Building2,
    LayoutDashboard, User, Plus, Trash2, GripVertical, Upload
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

interface WorkflowStep {
    id: number;
    step_order: number;
    step_name: string;
    approver_role: string | null;
    is_terminal: boolean;
}

interface Workflow {
    id: number;
    name: string;
    steps: WorkflowStep[];
}

interface FormType {
    id: number;
    name: string;
    description: string;
    schema_definition: any;
    workflow?: Workflow | null;
}

interface Application {
    id: number;
    form_type_id: number;
    submitted_by: number;
    current_status: string;
    submitted_at: string;
    updated_at: string;
    form_data: any;
    form_types?: FormType;
    users?: { first_name: string; last_name: string; email: string };
    form_approvals?: any[];
}

interface Profile {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    display_name: string;
    roles: string[];
    department: string | null;
    signature_url: string | null;
}

// sidebar views
type SidebarView = 'dashboard' | 'new' | 'all' | 'pending' | 'create_form' | 'profile';
type AppTab = 'ongoing' | 'completed';

// ─── Field builder types ─────────────────────────────────────────────
interface FieldDef {
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
}

interface WfStepDef {
    step_name: string;
    approver_role: string;
    is_terminal: boolean;
}

interface BuilderField {
    name: string;
    type: string;
    required: boolean;
}

interface BuilderStep {
    status: string;
    approval_roles: string[];
    fields: BuilderField[];
}

const FIELD_TYPES = ['text', 'textarea', 'date', 'bool', 'signature', 'number'];

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════

export default function Dashboard() {
    const router = useRouter();
    const [sidebarHovered, setSidebarHovered] = useState(false);

    // Auth
    const [user, setUser] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    // Navigation
    const [activeView, setActiveView] = useState<SidebarView>('dashboard');
    const [appTab, setAppTab] = useState<AppTab>('ongoing');

    // Data
    const [formTypes, setFormTypes] = useState<FormType[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(false);

    // Selection
    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    // Form submission
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Approval
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Create form builder
    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
    const [creating, setCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);

    // Profile
    const [sigUploading, setSigUploading] = useState(false);

    // ─── Auth Check ───────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }
        const userData = localStorage.getItem('user');
        if (userData) {
            const p = JSON.parse(userData);
            setUser(p);
            setUserRoles(p.roles || []);
        }
    }, [router]);

    // ─── Data Fetching ────────────────────────────────────────────────
    const fetchFormTypes = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/forms/types'); setFormTypes(r.data); }
        catch (e) { console.error('Failed to fetch types', e); }
        finally { setLoading(false); }
    }, []);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/forms'); setApplications(r.data); }
        catch (e) { console.error('Failed to fetch apps', e); }
        finally { setLoading(false); }
    }, []);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/profile'); setProfile(r.data); }
        catch (e) { console.error('Failed to fetch profile', e); }
        finally { setLoading(false); }
    }, []);

    const fetchRoles = useCallback(async () => {
        try { const r = await api.get('/profile/roles'); setAvailableRoles(r.data.map((role: any) => role.name)); }
        catch (e) { console.error('Failed to fetch roles', e); }
    }, []);

    useEffect(() => {
        if (activeView === 'new' || activeView === 'create_form') fetchFormTypes();
        if (activeView === 'create_form') fetchRoles();
        else if (activeView === 'all' || activeView === 'pending' || activeView === 'dashboard') fetchApplications();
        else if (activeView === 'profile') fetchProfile();
    }, [activeView, fetchFormTypes, fetchApplications, fetchProfile, fetchRoles]);

    // ─── Helpers ──────────────────────────────────────────────────────
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const allRoles = [...new Set([...liveRoles, ...storedRoles])];

    // Roles that can create forms
    const isAdmin = allRoles.includes('ADMIN');

    // Roles that are NOT regular applicants (i.e., they have a Pending Work queue)
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const canApprove = allRoles.length > 0 && !allRoles.every(r => NON_APPROVER_ROLES.includes(r));

    const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

    const myApps = applications.filter(a => a.submitted_by === user?.id);
    const ongoingApps = myApps.filter(a => !isTerminal(a.current_status));
    const completedApps = myApps.filter(a => isTerminal(a.current_status));
    // Backend already filters pending apps per role — show everything the backend returned that isn't ours
    const pendingApps = applications.filter(a => a.submitted_by !== user?.id && !isTerminal(a.current_status));
    const processedApps = applications.filter(a => isTerminal(a.current_status));

    // ─── Form Submit ──────────────────────────────────────────────────
    const handleFormSubmit = async () => {
        if (!selectedFormType) return;
        setSubmitting(true); setSubmitSuccess(false);
        try {
            await api.post('/forms', { form_type_id: selectedFormType.id, form_data: formData });
            setSubmitSuccess(true);
            setFormData({});
            setTimeout(() => { setSubmitSuccess(false); setSelectedFormType(null); setActiveView('all'); setAppTab('ongoing'); fetchApplications(); }, 1500);
        } catch (e) { console.error('Submit failed', e); alert('Failed to submit'); }
        finally { setSubmitting(false); }
    };

    // ─── Approve / Reject ─────────────────────────────────────────────
    const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setActionLoading(true);
        try { await api.patch(`/forms/${selectedApp.id}/status`, { decision, remarks }); setRemarks(''); setSelectedApp(null); fetchApplications(); }
        catch (e) { console.error('Decision failed', e); alert('Failed to update'); }
        finally { setActionLoading(false); }
    };

    // ─── Create Form Type ─────────────────────────────────────────────
    const handleCreateFormType = async () => {
        if (!newFormName.trim()) { alert('Form name is required'); return; }
        setCreating(true); setCreateSuccess(false);
        try {
            // Build schema
            const schema: any = {};
            builderSteps.forEach((s, i) => {
                const stepOrder = String(i + 1);
                schema[stepOrder] = [
                    { status: s.status },
                    ...s.fields.filter(f => f.name.trim()).map(f => ({
                        name: f.name.trim(),
                        type: f.type,
                        required: f.required
                    }))
                ];
            });

            const steps = builderSteps.map((s, i) => ({
                step_name: s.status,
                approval_roles: s.approval_roles.length > 0 ? s.approval_roles : ['ADMIN'],
                is_terminal: i === builderSteps.length - 1,
            }));

            await api.post('/forms/types', {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema_definition: schema,
                workflow_steps: steps,
            });

            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setBuilderSteps([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
            fetchFormTypes();
            setTimeout(() => setCreateSuccess(false), 3000);
        } catch (e: any) {
            console.error('Create form type failed', e);
            alert(e.response?.data?.error || 'Failed to create form type');
        } finally { setCreating(false); }
    };

    // ─── Signature Upload ─────────────────────────────────────────────
    const handleSigUpload = async (file: File) => {
        setSigUploading(true);
        try {
            const fd = new FormData();
            fd.append('signature', file);
            const r = await api.post('/profile/signature', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setProfile(prev => prev ? { ...prev, signature_url: r.data.signature_url } : prev);
        } catch (e) { console.error('Sig upload failed', e); alert('Failed to upload'); }
        finally { setSigUploading(false); }
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); };

    const handleSidebarClick = (v: SidebarView) => {
        setActiveView(v); setSelectedFormType(null); setSelectedApp(null); setFormData({}); setSubmitSuccess(false);
    };

    // ─── Schema field renderer ────────────────────────────────────────
    const getSchemaFields = (schema: any): FieldDef[] => {
        if (schema?.fields && Array.isArray(schema.fields)) return schema.fields;

        // Handle new JSON schema structure (only fields from step 1 for applicants)
        if (schema && typeof schema === 'object' && Array.isArray(schema['1'])) {
            const fields: FieldDef[] = [];
            schema['1'].forEach((item: any) => {
                if (item.name) {
                    fields.push({
                        key: item.name.replace(/\s+/g, '_'),
                        label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                        type: item.type || 'text',
                        required: item.required === true || item.required === 'true',
                    });
                }
            });
            return fields;
        }

        if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
            return [
                { key: 'name', label: 'Full Name', type: 'text', required: true },
                { key: 'department', label: 'Department', type: 'text', required: true },
                { key: 'leave_type', label: 'Leave Type', type: 'select', required: true, options: ['Casual Leave', 'Earned Leave', 'Sick Leave'] },
                { key: 'start_date', label: 'Start Date', type: 'date', required: true },
                { key: 'end_date', label: 'End Date', type: 'date', required: true },
                { key: 'reason', label: 'Reason', type: 'textarea', required: true },
            ];
        }
        return Object.entries(schema).map(([k, v]: [string, any]) => ({
            key: k, label: v?.label || k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            type: v?.type || 'text', required: v?.required ?? false,
        }));
    };

    // SB collapsed width & expanded width
    const SB_W = 64;

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════
    const sidebarItems: { id: SidebarView; icon: React.ReactNode; label: string; admin?: boolean; badge?: number }[] = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { id: 'new', icon: <FilePlus size={20} />, label: 'New Application' },
        { id: 'all', icon: <FileText size={20} />, label: 'All Applications' },
        { id: 'pending', icon: <ClipboardList size={20} />, label: 'Pending Work', admin: true, badge: pendingApps.filter(a => a.submitted_by !== user?.id).length || undefined }
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", overflow: 'hidden' }}>

            {/* ─── LEFT SIDEBAR ─────────────────────────────────────── */}
            <aside
                style={{
                    width: SB_W,
                    minWidth: SB_W,
                    background: '#ffffff',
                    color: '#374151',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 20,
                    boxShadow: '2px 0 16px rgba(0,0,0,0.05)',
                    borderRight: '1px solid #e5e7eb',
                }}
            >
                {/* Logo */}
                <div style={{
                    padding: '20px 0',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    minHeight: '68px',
                }}>
                    <Building2 size={24} style={{ color: '#3b82f6', flexShrink: 0 }} />
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sidebarItems.map(item => {
                        if (item.admin && !canApprove) return null;
                        const active = activeView === item.id;
                        return (
                            <div key={item.id} style={{ position: 'relative' }} className="group">
                                <button
                                    onClick={() => handleSidebarClick(item.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '12px 0',
                                        border: 'none',
                                        background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                                        color: active ? '#3b82f6' : '#6b7280',
                                        cursor: 'pointer',
                                        borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                                    {item.badge && (
                                        <span style={{
                                            position: 'absolute', top: '4px', right: '12px',
                                            background: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 700,
                                            padding: '2px 5px', borderRadius: '10px',
                                        }}>{item.badge}</span>
                                    )}
                                </button>
                                {/* Tooltip */}
                                <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                                    {item.label}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom section (Profile and Logout) */}
                <div style={{ padding: '12px 0', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                    {/* Profile */}
                    <div style={{ position: 'relative' }} className="group">
                        <button onClick={() => handleSidebarClick('profile')} style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '12px 0', border: 'none',
                            background: activeView === 'profile' ? 'rgba(59,130,246,0.1)' : 'transparent',
                            color: activeView === 'profile' ? '#3b82f6' : '#6b7280',
                            cursor: 'pointer', transition: 'all 0.15s',
                            borderLeft: activeView === 'profile' ? '3px solid #3b82f6' : '3px solid transparent',
                        }}
                            onMouseEnter={e => { if (activeView !== 'profile') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                            onMouseLeave={e => { if (activeView !== 'profile') e.currentTarget.style.background = 'transparent'; }}
                        >
                            <User size={20} />
                        </button>
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                            Profile
                        </div>
                    </div>

                    {/* Logout */}
                    <div style={{ position: 'relative' }} className="group">
                        <button onClick={handleLogout} style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '12px 0', border: 'none', background: 'transparent',
                            color: '#6b7280', cursor: 'pointer', transition: 'background 0.2s',
                            borderLeft: '3px solid transparent',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={20} />
                        </button>
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                            Sign Out
                        </div>
                    </div>
                </div>
            </aside>

            {/* ─── MIDDLE PANEL ─────────────────────────────────────── */}
            <div style={{
                width: '300px', minWidth: '260px', background: '#fff',
                borderRight: '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0', background: '#fafbfc' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                        {activeView === 'dashboard' && 'Overview'}
                        {activeView === 'new' && 'Available Forms'}
                        {activeView === 'all' && 'My Applications'}
                        {activeView === 'pending' && 'Pending Work'}
                        {activeView === 'create_form' && 'Form Builder'}
                        {activeView === 'profile' && 'Profile Settings'}
                    </h2>
                </div>

                {/* Tabs */}
                {(activeView === 'all' || activeView === 'pending') && (
                    <div style={{ display: 'flex', padding: '10px 12px 0', gap: '4px' }}>
                        <TabBtn label={activeView === 'pending' ? 'Pending' : 'Ongoing'} active={appTab === 'ongoing'} onClick={() => setAppTab('ongoing')} />
                        <TabBtn label="Completed" active={appTab === 'completed'} onClick={() => setAppTab('completed')} />
                    </div>
                )}

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                    {loading ? <Spin /> : (
                        <>
                            {/* DASHBOARD */}
                            {activeView === 'dashboard' && (
                                <div style={{ padding: '16px' }}>
                                    <StatCard label="Total Applications" value={myApps.length} color="#2563eb" />
                                    <StatCard label="Ongoing" value={ongoingApps.length} color="#d97706" />
                                    <StatCard label="Completed" value={completedApps.length} color="#16a34a" />
                                    {canApprove && <StatCard label="Pending Approvals" value={pendingApps.length} color="#dc2626" />}
                                </div>
                            )}

                            {/* NEW APPLICATION */}
                            {activeView === 'new' && (
                                <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ flex: 1 }}>
                                        {formTypes.length === 0 ? <Empty msg="No forms available" /> :
                                            formTypes.map(ft => (
                                                <ListItem key={ft.id} sel={selectedFormType?.id === ft.id}
                                                    onClick={() => { setSelectedFormType(ft); setSelectedApp(null); setFormData({}); setSubmitSuccess(false); }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <IconBox sel={selectedFormType?.id === ft.id}><FileText size={14} /></IconBox>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{ft.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ft.description || 'Click to fill'}</div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={14} style={{ color: '#d1d5db' }} />
                                                </ListItem>
                                            ))
                                        }
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleSidebarClick('create_form')}
                                            style={{
                                                position: 'absolute', bottom: '20px', right: '20px',
                                                width: '48px', height: '48px', borderRadius: '24px',
                                                background: '#3b82f6', color: '#fff',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 4px 12px rgba(59,130,246,0.5)', border: 'none', cursor: 'pointer', zIndex: 10
                                            }}
                                        >
                                            <Plus size={24} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* ALL APPLICATIONS */}
                            {activeView === 'all' && (() => {
                                const list = appTab === 'ongoing' ? ongoingApps : completedApps;
                                return list.length === 0 ? <Empty msg={`No ${appTab} applications`} /> :
                                    list.map(a => (
                                        <ListItem key={a.id} sel={selectedApp?.id === a.id}
                                            onClick={() => { setSelectedApp(a); setSelectedFormType(null); }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{a.form_types?.name || 'Application'}</div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                    {new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <Badge status={a.current_status} />
                                        </ListItem>
                                    ));
                            })()}

                            {/* PENDING WORK */}
                            {activeView === 'pending' && (() => {
                                const list = appTab === 'ongoing' ? pendingApps : processedApps;
                                return list.length === 0 ? <Empty msg={`No ${appTab === 'ongoing' ? 'pending' : 'completed'} items`} /> :
                                    list.map(a => (
                                        <ListItem key={a.id} sel={selectedApp?.id === a.id}
                                            onClick={() => { setSelectedApp(a); setSelectedFormType(null); }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                                    {a.users ? `${a.users.first_name} ${a.users.last_name}` : 'Unknown'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{a.form_types?.name || 'Application'}</div>
                                                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                                    {new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                            <Badge status={a.current_status} />
                                        </ListItem>
                                    ));
                            })()}

                            {/* CREATE FORM — handled only in right panel */}
                            {activeView === 'create_form' && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                                    <Plus size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                    Use the form builder on the right to create a new application form.
                                </div>
                            )}

                            {/* PROFILE — handled in right panel */}
                            {activeView === 'profile' && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                                    <User size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                    Your profile information is shown on the right.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANEL ──────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

                {/* WELCOME */}
                {activeView === 'dashboard' && !selectedApp && !selectedFormType && (
                    <WelcomeScreen user={user} stats={{ total: myApps.length, ongoing: ongoingApps.length, completed: completedApps.length }} />
                )}

                {/* NEW APPLICATION — FORM FILL */}
                {activeView === 'new' && !selectedFormType && (
                    <WelcomeScreen user={user} stats={{ total: myApps.length, ongoing: ongoingApps.length, completed: completedApps.length }} />
                )}

                {selectedFormType && (
                    <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
                        {submitSuccess ? <SuccessMsg /> : (
                            <>
                                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>{selectedFormType.name}</h1>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>{selectedFormType.description || 'Fill in the details below.'}</p>

                                {/* Workflow badge */}
                                {selectedFormType.workflow && selectedFormType.workflow.steps.length > 0 && (
                                    <div style={{ background: '#f0f9ff', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', border: '1px solid #bae6fd' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approval Workflow</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                            {selectedFormType.workflow.steps.map((s, i) => (
                                                <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 500, background: '#dbeafe', padding: '2px 8px', borderRadius: '10px' }}>
                                                        {s.step_name.replace(/_/g, ' ')}
                                                    </span>
                                                    {i < selectedFormType.workflow!.steps.length - 1 && <ChevronRight size={10} style={{ color: '#93c5fd' }} />}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Form Fields */}
                                <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {getSchemaFields(selectedFormType.schema_definition).map(f => (
                                            <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'auto' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                                                    {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                </label>
                                                {f.type === 'textarea' ? (
                                                    <textarea value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} rows={3}
                                                        style={inputStyle} />
                                                ) : f.type === 'select' ? (
                                                    <select value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                        style={{ ...inputStyle, background: '#fff' }}>
                                                        <option value="">Select...</option>
                                                        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                ) : f.type === 'bool' ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 8px' }}>
                                                        <input type="checkbox" checked={formData[f.key] === true || formData[f.key] === 'true'} onChange={e => setFormData({ ...formData, [f.key]: e.target.checked })}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }} />
                                                        <span style={{ marginLeft: '10px', fontSize: '13px', color: '#4b5563' }}>{f.label}</span>
                                                    </div>
                                                ) : (
                                                    <input type={f.type} value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                        style={inputStyle} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <BtnSecondary onClick={() => { setSelectedFormType(null); setFormData({}); }}>Cancel</BtnSecondary>
                                        <BtnPrimary onClick={handleFormSubmit} disabled={submitting}>
                                            {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Application</>}
                                        </BtnPrimary>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* APPLICATION DETAIL */}
                {selectedApp && (
                    <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>{selectedApp.form_types?.name || 'Application'} #{selectedApp.id}</h1>
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                                    {selectedApp.users ? `${selectedApp.users.first_name} ${selectedApp.users.last_name}` : ''} · {new Date(selectedApp.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <Badge status={selectedApp.current_status} lg />
                        </div>

                        {/* Workflow progress */}
                        {selectedApp.form_types?.workflow && (
                            <Panel title="Workflow Progress">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    {selectedApp.form_types.workflow.steps.map((step, i) => {
                                        const steps = selectedApp.form_types!.workflow!.steps;
                                        const curIdx = steps.findIndex(s => s.step_name === selectedApp.current_status);
                                        const isPast = curIdx > i || selectedApp.current_status === 'APPROVED';
                                        const isCur = step.step_name === selectedApp.current_status;
                                        return (
                                            <span key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: isCur ? 700 : 500,
                                                    color: isPast ? '#16a34a' : isCur ? '#2563eb' : '#9ca3af',
                                                    background: isPast ? '#dcfce7' : isCur ? '#dbeafe' : '#f3f4f6',
                                                    padding: '3px 10px', borderRadius: '10px',
                                                    border: isCur ? '1px solid #93c5fd' : 'none',
                                                }}>{step.step_name.replace(/_/g, ' ')}</span>
                                                {i < steps.length - 1 && <ChevronRight size={10} style={{ color: '#d1d5db' }} />}
                                            </span>
                                        );
                                    })}
                                    <ChevronRight size={10} style={{ color: '#d1d5db' }} />
                                    <span style={{
                                        fontSize: '11px', fontWeight: isTerminal(selectedApp.current_status) ? 700 : 500,
                                        color: selectedApp.current_status === 'APPROVED' ? '#16a34a' : selectedApp.current_status === 'REJECTED' ? '#dc2626' : '#9ca3af',
                                        background: selectedApp.current_status === 'APPROVED' ? '#dcfce7' : selectedApp.current_status === 'REJECTED' ? '#fee2e2' : '#f3f4f6',
                                        padding: '3px 10px', borderRadius: '10px',
                                    }}>{isTerminal(selectedApp.current_status) ? selectedApp.current_status : 'Done'}</span>
                                </div>
                            </Panel>
                        )}

                        {/* Form Data */}
                        <Panel title="Application Details">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {Object.entries(selectedApp.form_data || {}).map(([k, v]) => (
                                    <div key={k} style={{ gridColumn: String(v).length > 50 ? 'span 2' : 'auto' }}>
                                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.replace(/_/g, ' ')}</div>
                                        <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{String(v) || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </Panel>

                        {/* Approve / Reject */}
                        {canApprove && activeView === 'pending' && !isTerminal(selectedApp.current_status) && (
                            <Panel title="Take Action">
                                <textarea placeholder="Remarks (optional)..." value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                                    style={{ ...inputStyle, marginBottom: '14px' }} />
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleDecision('REJECTED')} disabled={actionLoading}
                                        style={{ flex: 1, padding: '10px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <XCircle size={14} /> Reject
                                    </button>
                                    <button onClick={() => handleDecision('APPROVED')} disabled={actionLoading}
                                        style={{ flex: 1, padding: '10px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                                        <CheckCircle size={14} /> Approve
                                    </button>
                                </div>
                            </Panel>
                        )}
                    </div>
                )}

                {/* ─── CREATE FORM (Admin) ──────────────────────────── */}
                {activeView === 'create_form' && (
                    <div style={{ padding: '32px 40px', maxWidth: '740px', margin: '0 auto' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>Create New Form</h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>Define a custom application form with fields and approval workflow.</p>

                        {createSuccess && (
                            <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#166534', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={16} /> Form created successfully!
                            </div>
                        )}

                        {/* Basic info */}
                        <Panel title="Form Details">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Form Title *</label>
                                    <input value={newFormName} onChange={e => setNewFormName(e.target.value)} placeholder="e.g. Leave Application" style={inputStyle} />
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Description</label>
                                    <input value={newFormDesc} onChange={e => setNewFormDesc(e.target.value)} placeholder="Brief description..." style={inputStyle} />
                                </div>
                            </div>
                        </Panel>

                        {/* Dynamic Step Builder */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {builderSteps.map((step, stepIndex) => (
                                <Panel key={stepIndex} title={`Step ${stepIndex + 1}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ flex: 1, marginRight: '16px' }}>
                                            <label style={labelStyle}>Status Name *</label>
                                            <input
                                                value={step.status}
                                                onChange={e => {
                                                    const newSteps = [...builderSteps];
                                                    newSteps[stepIndex].status = e.target.value;
                                                    setBuilderSteps(newSteps);
                                                }}
                                                placeholder="e.g. HOD Approval"
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div style={{ flex: 1, marginRight: '16px' }}>
                                            <label style={labelStyle}>Approval Roles</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px' }}>
                                                {availableRoles.length === 0 && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading roles...</span>}
                                                {availableRoles.map(role => {
                                                    const selected = step.approval_roles.includes(role);
                                                    return (
                                                        <button
                                                            key={role}
                                                            type="button"
                                                            onClick={() => {
                                                                const newSteps = [...builderSteps];
                                                                const current = newSteps[stepIndex].approval_roles;
                                                                newSteps[stepIndex].approval_roles = selected
                                                                    ? current.filter(r => r !== role)
                                                                    : [...current, role];
                                                                setBuilderSteps(newSteps);
                                                            }}
                                                            style={{
                                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none',
                                                                background: selected ? '#2563eb' : '#e5e7eb',
                                                                color: selected ? '#fff' : '#374151',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            {role}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {builderSteps.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to remove this step?')) {
                                                        const newSteps = [...builderSteps];
                                                        newSteps.splice(stepIndex, 1);
                                                        setBuilderSteps(newSteps);
                                                    }
                                                }}
                                                style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, marginTop: '16px' }}
                                            >
                                                <Trash2 size={14} /> Remove Step
                                            </button>
                                        )}
                                    </div>

                                    {/* Fields List */}
                                    <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>Fields for this step</div>

                                        {step.fields.map((field, fieldIndex) => (
                                            <div key={fieldIndex} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px', paddingBottom: '12px', borderBottom: fieldIndex < step.fields.length - 1 ? '1px dashed #d1d5db' : 'none' }}>
                                                <div style={{ flex: 2 }}>
                                                    <label style={labelStyle}>Field Name</label>
                                                    <input
                                                        value={field.name}
                                                        onChange={e => {
                                                            const newSteps = [...builderSteps];
                                                            newSteps[stepIndex].fields[fieldIndex].name = e.target.value;
                                                            setBuilderSteps(newSteps);
                                                        }}
                                                        placeholder="e.g. designation"
                                                        style={inputStyleSm}
                                                    />
                                                </div>
                                                <div style={{ flex: 1.5 }}>
                                                    <label style={labelStyle}>Type</label>
                                                    <select
                                                        value={field.type}
                                                        onChange={e => {
                                                            const newSteps = [...builderSteps];
                                                            newSteps[stepIndex].fields[fieldIndex].type = e.target.value;
                                                            setBuilderSteps(newSteps);
                                                        }}
                                                        style={{ ...inputStyleSm, background: '#fff' }}
                                                    >
                                                        {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px', gap: '4px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={e => {
                                                            const newSteps = [...builderSteps];
                                                            newSteps[stepIndex].fields[fieldIndex].required = e.target.checked;
                                                            setBuilderSteps(newSteps);
                                                        }}
                                                    />
                                                    <label style={{ fontSize: '12px', color: '#4b5563', marginRight: '8px' }}>Required</label>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm('Are you sure you want to remove this field?')) {
                                                                const newSteps = [...builderSteps];
                                                                newSteps[stepIndex].fields.splice(fieldIndex, 1);
                                                                setBuilderSteps(newSteps);
                                                            }
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => {
                                                const newSteps = [...builderSteps];
                                                newSteps[stepIndex].fields.push({ name: '', type: 'text', required: false });
                                                setBuilderSteps(newSteps);
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
                                        >
                                            <Plus size={14} /> Add Field
                                        </button>
                                    </div>
                                </Panel>
                            ))}

                            <button
                                onClick={() => {
                                    setBuilderSteps([...builderSteps, { status: '', approval_roles: [], fields: [{ name: '', type: 'text', required: false }] }]);
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#dbeafe', border: '1px dashed #3b82f6', color: '#1d4ed8', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                            >
                                <Plus size={16} /> Add new Step
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', margin: '24px 0' }}>
                            <BtnSecondary onClick={() => { setActiveView('dashboard'); setNewFormName(''); setNewFormDesc(''); setBuilderSteps([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]); }}>Cancel</BtnSecondary>
                            <BtnPrimary onClick={handleCreateFormType} disabled={creating}>
                                {creating ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : <><CheckCircle size={14} /> Save Form</>}
                            </BtnPrimary>
                        </div>
                    </div>
                )}

                {/* ─── PROFILE ──────────────────────────────────────── */}
                {activeView === 'profile' && (
                    <div style={{ padding: '32px 40px', maxWidth: '600px', margin: '0 auto' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 24px' }}>Profile</h1>

                        <Panel title="Personal Information">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                <InfoRow label="Display Name" value={profile?.display_name || user?.name || '—'} />
                                <InfoRow label="Email" value={profile?.email || user?.email || '—'} />
                                <InfoRow label="Role" value={profile?.roles?.join(', ') || '—'} />
                                <InfoRow label="Department" value={profile?.department || '—'} />
                            </div>
                        </Panel>

                        <Panel title="Digital Signature">
                            {profile?.signature_url ? (
                                <div style={{ marginBottom: '16px' }}>
                                    <img src={`http://localhost:4000${profile.signature_url}`} alt="Signature" style={{ maxHeight: '80px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', background: '#fff' }} />
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>No signature uploaded yet.</p>
                            )}
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', border: '2px dashed #d1d5db', borderRadius: '8px',
                                fontSize: '13px', color: '#2563eb', fontWeight: 600, cursor: 'pointer',
                                transition: 'border-color 0.2s',
                            }}>
                                <Upload size={16} />
                                {sigUploading ? 'Uploading...' : 'Upload Signature'}
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { if (e.target.files?.[0]) handleSigUpload(e.target.files[0]); }} />
                            </label>
                        </Panel>
                    </div>
                )}
            </main>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-components & styles
// ═══════════════════════════════════════════════════════════════════════

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff'
};
const inputStyleSm: React.CSSProperties = { ...inputStyle, padding: '7px 10px', fontSize: '12px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' };

function BtnPrimary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{
            padding: '10px 24px', border: 'none',
            background: disabled ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
            color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
        }}>{children}</button>
    );
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            padding: '10px 20px', border: '1px solid #d1d5db', background: '#fff',
            borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: 500,
        }}>{children}</button>
    );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            flex: 1, padding: '7px 14px', border: 'none',
            background: active ? '#2563eb' : '#f3f4f6', color: active ? '#fff' : '#6b7280',
            fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
        }}>{label}</button>
    );
}

function ListItem({ children, sel, onClick }: { children: React.ReactNode; sel: boolean; onClick: () => void }) {
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', cursor: 'pointer',
            background: sel ? '#eff6ff' : '#fff',
            borderLeft: sel ? '3px solid #2563eb' : '3px solid transparent',
            borderBottom: '1px solid #f3f4f6', transition: 'all 0.1s',
        }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#f9fafb'; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}
        >{children}</div>
    );
}

function IconBox({ sel, children }: { sel: boolean; children: React.ReactNode }) {
    return (
        <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: sel ? '#dbeafe' : '#f3f4f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: sel ? '#2563eb' : '#6b7280',
        }}>{children}</div>
    );
}

function Badge({ status, lg }: { status: string; lg?: boolean }) {
    const ok = status === 'APPROVED'; const no = status === 'REJECTED';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : '#fef3c7';
    const c = ok ? '#16a34a' : no ? '#dc2626' : '#d97706';
    const Icon = ok ? CheckCircle : no ? XCircle : Clock;
    const label = ok ? 'Approved' : no ? 'Rejected' : status.replace(/_/g, ' ');
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: bg, color: c,
            fontSize: lg ? '12px' : '10px', fontWeight: 600,
            padding: lg ? '4px 12px' : '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
        }}><Icon size={lg ? 12 : 10} />{label}</span>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
            {children}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
            <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{value}</div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{
            background: '#fff', borderRadius: '10px', padding: '16px', marginBottom: '10px',
            border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</span>
        </div>
    );
}

function WelcomeScreen({ user, stats }: { user: any; stats: { total: number; ongoing: number; completed: number } }) {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#0f172a,#2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px', boxShadow: '0 8px 32px rgba(37,99,235,0.2)',
            }}>
                <Building2 size={40} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>IIT ROPAR</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280', margin: '0 0 20px' }}>Leave Forms &amp; Application Portal</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '340px', lineHeight: '1.6' }}>
                Welcome{user?.name ? `, ${user.name}` : ''}! Select an option from the sidebar to get started.
            </p>
        </div>
    );
}

function Spin() {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" style={{ color: '#9ca3af' }} /></div>;
}

function Empty({ msg }: { msg: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '12px', margin: 0 }}>{msg}</p>
        </div>
    );
}

function SuccessMsg() {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={28} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>Application Submitted!</h2>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '13px' }}>Redirecting...</p>
        </div>
    );
}
