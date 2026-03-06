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

const FIELD_TYPES = ['text', 'textarea', 'date', 'number', 'select', 'file'];

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
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Approval
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Create form builder
    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [newFields, setNewFields] = useState<FieldDef[]>([{ key: 'field_1', label: '', type: 'text', required: true }]);
    const [newWfSteps, setNewWfSteps] = useState<WfStepDef[]>([{ step_name: '', approver_role: '', is_terminal: false }]);
    const [creating, setCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);

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

    useEffect(() => {
        if (activeView === 'new' || activeView === 'create_form') fetchFormTypes();
        else if (activeView === 'all' || activeView === 'pending' || activeView === 'dashboard') fetchApplications();
        else if (activeView === 'profile') fetchProfile();
    }, [activeView, fetchFormTypes, fetchApplications, fetchProfile]);

    // ─── Helpers ──────────────────────────────────────────────────────
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const allRoles = [...liveRoles, ...storedRoles];
    const isAdmin = allRoles.includes('ADMIN') || allRoles.includes('HOD') || allRoles.includes('APPROVER');

    const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

    const myApps = applications.filter(a => a.submitted_by === user?.id);
    const ongoingApps = myApps.filter(a => !isTerminal(a.current_status));
    const completedApps = myApps.filter(a => isTerminal(a.current_status));
    const pendingApps = applications.filter(a => !isTerminal(a.current_status));
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
            // Build schema definition from fields
            const schema = {
                fields: newFields.filter(f => f.label.trim()).map(f => ({
                    key: f.label.toLowerCase().replace(/\s+/g, '_'),
                    label: f.label,
                    type: f.type,
                    required: f.required,
                    ...(f.options && f.options.length > 0 ? { options: f.options } : {}),
                }))
            };
            const steps = newWfSteps.filter(s => s.step_name.trim()).map((s, i) => ({
                step_name: s.step_name.toUpperCase().replace(/\s+/g, '_'),
                approver_role: s.approver_role || 'ADMIN',
                is_terminal: i === newWfSteps.length - 1, // last step is terminal
            }));

            await api.post('/forms/types', {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema_definition: schema,
                workflow_steps: steps,
            });

            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setNewFields([{ key: 'field_1', label: '', type: 'text', required: true }]);
            setNewWfSteps([{ step_name: '', approver_role: '', is_terminal: false }]);
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
        { id: 'pending', icon: <ClipboardList size={20} />, label: 'Pending Work', admin: true, badge: pendingApps.length || undefined },
        { id: 'create_form', icon: <Plus size={20} />, label: 'Create Form', admin: true },
        { id: 'profile', icon: <User size={20} />, label: 'Profile' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", overflow: 'hidden' }}>

            {/* ─── LEFT SIDEBAR ─────────────────────────────────────── */}
            <aside
                style={{
                    width: SB_W,
                    minWidth: SB_W,
                    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 20,
                    boxShadow: '2px 0 16px rgba(0,0,0,0.15)',
                }}
            >
                {/* Logo */}
                <div style={{
                    padding: '20px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    minHeight: '68px',
                }}>
                    <Building2 size={24} style={{ color: '#60a5fa', flexShrink: 0 }} />
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sidebarItems.map(item => {
                        if (item.admin && !isAdmin) return null;
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
                                        background: active ? 'rgba(96,165,250,0.15)' : 'transparent',
                                        color: active ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
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

                {/* Bottom logout */}
                <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ position: 'relative' }} className="group">
                        <button onClick={handleLogout} style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '12px 0', border: 'none', background: 'transparent',
                            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'background 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
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
                                    {isAdmin && <StatCard label="Pending Approvals" value={pendingApps.length} color="#dc2626" />}
                                </div>
                            )}

                            {/* NEW APPLICATION */}
                            {activeView === 'new' && (
                                formTypes.length === 0 ? <Empty msg="No forms available" /> :
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
                        {isAdmin && activeView === 'pending' && !isTerminal(selectedApp.current_status) && (
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

                        {/* Fields */}
                        <Panel title="Form Fields">
                            {newFields.map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px', background: '#f9fafb', borderRadius: '8px', padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={labelStyle}>Label</label>
                                        <input value={f.label} onChange={e => { const n = [...newFields]; n[i].label = e.target.value; setNewFields(n); }}
                                            placeholder="e.g. Full Name" style={inputStyleSm} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Type</label>
                                        <select value={f.type} onChange={e => { const n = [...newFields]; n[i].type = e.target.value; setNewFields(n); }}
                                            style={{ ...inputStyleSm, background: '#fff' }}>
                                            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280', cursor: 'pointer', marginBottom: '4px' }}>
                                        <input type="checkbox" checked={f.required} onChange={e => { const n = [...newFields]; n[i].required = e.target.checked; setNewFields(n); }} />
                                        Req
                                    </label>
                                    <button onClick={() => setNewFields(newFields.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', marginBottom: '4px' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setNewFields([...newFields, { key: `field_${newFields.length + 1}`, label: '', type: 'text', required: false }])}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px dashed #d1d5db', background: '#fff', color: '#2563eb', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                <Plus size={14} /> Add Field
                            </button>
                        </Panel>

                        {/* Workflow Steps */}
                        <Panel title="Approval Workflow Steps">
                            {newWfSteps.map((s, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '10px', background: '#f0f9ff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0f2fe' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={labelStyle}>Step Name</label>
                                        <input value={s.step_name} onChange={e => { const n = [...newWfSteps]; n[i].step_name = e.target.value; setNewWfSteps(n); }}
                                            placeholder="e.g. HOD Review" style={inputStyleSm} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={labelStyle}>Approver Role</label>
                                        <select value={s.approver_role} onChange={e => { const n = [...newWfSteps]; n[i].approver_role = e.target.value; setNewWfSteps(n); }}
                                            style={{ ...inputStyleSm, background: '#fff' }}>
                                            <option value="">Select</option>
                                            <option value="HOD">HOD</option>
                                            <option value="ADMIN">Admin</option>
                                            <option value="APPROVER">Approver</option>
                                        </select>
                                    </div>
                                    <button onClick={() => setNewWfSteps(newWfSteps.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', marginBottom: '4px' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setNewWfSteps([...newWfSteps, { step_name: '', approver_role: '', is_terminal: false }])}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px dashed #93c5fd', background: '#fff', color: '#2563eb', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                                <Plus size={14} /> Add Step
                            </button>
                        </Panel>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
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
