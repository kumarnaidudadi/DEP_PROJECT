'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    FilePlus, FileText, Clock, CheckCircle, XCircle, LogOut,
    ChevronRight, ChevronDown, Loader2, Send, ClipboardList, AlertCircle, Building2,
    LayoutDashboard, User, Plus, Trash2, GripVertical, Upload
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

interface WorkflowStep {
    id: number;
    step_order: number;
    step_name: string;
    approval_roles: string[];
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
    min?: number;
    max?: number;
    subFields?: { key: string; label: string; type: string }[];
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
    options?: string[];
    min?: number;
    max?: number;
    subFields?: { name: string; type: string }[];
}

interface BuilderStep {
    status: string;
    approval_roles: string[];
    fields: BuilderField[];
    showAllRoles?: boolean;
}

const FIELD_TYPES = [
    'text', 'number', 'date', 'date_from_to',
    'bool', 'select', 'textarea', 'signature',
    'department', 'role', 'tuple', 'list',
];

const FIELD_TYPE_LABELS: Record<string, string> = {
    text: 'Text', number: 'Number', date: 'Date', date_from_to: 'Date Range',
    bool: 'Yes / No', select: 'Select (Options)', textarea: 'Long Text',
    signature: 'Signature', department: 'Department', role: 'Role',
    tuple: 'Group (Tuple)', list: 'Repeating List',
};

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
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);

    // Create form builder
    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
    const [creating, setCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [editingFormId, setEditingFormId] = useState<number | null>(null);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);

    // Profile
    const [sigUploading, setSigUploading] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

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

    const fetchDepartments = useCallback(async () => {
        try { const r = await api.get('/profile/departments'); setAvailableDepartments(r.data); }
        catch (e) { console.error('Failed to fetch departments', e); }
    }, []);

    useEffect(() => {
        if (activeView === 'new' || activeView === 'create_form') fetchFormTypes();
        if (activeView === 'create_form' || activeView === 'new') {
            fetchRoles();
            fetchDepartments();
        }
        else if (activeView === 'all' || activeView === 'pending' || activeView === 'dashboard') fetchApplications();
        else if (activeView === 'profile') fetchProfile();
    }, [activeView, fetchFormTypes, fetchApplications, fetchProfile, fetchRoles, fetchDepartments]);

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

    const pendingApps = applications.filter(a => {
        if (a.submitted_by === user?.id || isTerminal(a.current_status)) return false;
        return a.form_approvals?.some(appr => appr.decision === 'PENDING' && appr.approved_by === user?.id);
    });

    const processedApps = applications.filter(a => {
        if (a.submitted_by === user?.id || !isTerminal(a.current_status)) return false;
        return a.form_approvals?.some(appr => appr.decision !== 'PENDING' && appr.approved_by === user?.id);
    });

    // ─── Form Submit ──────────────────────────────────────────────────
    const handleFormSubmit = async () => {
        if (!selectedFormType) return;

        // Validation for required fields
        const schemaFields = getSchemaFields(selectedFormType.schema_definition);
        const missingFields: string[] = [];

        schemaFields.forEach(f => {
            if (f.required) {
                if (f.type === 'date_from_to') {
                    if (!formData[`${f.key}_from`] || !formData[`${f.key}_to`]) {
                        missingFields.push(f.label);
                    }
                } else if (!formData[f.key]) {
                    missingFields.push(f.label);
                }
            }
        });

        if (missingFields.length > 0) {
            alert(`Please fill in all required fields:\n- ${missingFields.join('\n- ')}`);
            return;
        }

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

        // Validation for approval fields
        if (decision === 'APPROVED') {
            const steps = selectedApp.form_types?.workflow?.steps || [];
            const schema = selectedApp.form_types?.schema_definition || {};
            const approvalFields = getApprovalFields(schema, steps, selectedApp.current_status);

            for (const f of approvalFields) {
                if (f.required && !approvalData[f.key]) {
                    alert(`${f.label} is required to approve this step.`);
                    return;
                }
            }
        }

        setActionLoading(true);
        try {
            await api.patch(`/forms/${selectedApp.id}/status`, { decision, remarks, approvalData });
            setRemarks('');
            setApprovalData({});
            setSelectedApp(null);
            fetchApplications();
        }
        catch (e) { console.error('Decision failed', e); alert('Failed to update'); }
        finally { setActionLoading(false); }
    };

    // ─── Download PDF ─────────────────────────────────────────────────
    const handleDownloadPdf = async (appId: number, appName: string) => {
        try {
            const response = await api.get(`/forms/${appId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${appName.replace(/\s+/g, '_')}_${appId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('Download failed', e);
            alert('Failed to download PDF. Please try again.');
        }
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
                        required: f.required,
                        ...(f.options?.length ? { options: f.options.filter(Boolean) } : {}),
                        ...(f.min !== undefined ? { min: f.min } : {}),
                        ...(f.max !== undefined ? { max: f.max } : {}),
                        ...(f.subFields?.length ? { subFields: f.subFields } : {}),
                    }))
                ];
            });

            const steps = builderSteps.map((s, i) => ({
                step_name: s.status,
                approval_roles: s.approval_roles,
                is_terminal: i === builderSteps.length - 1,
            }));

            const payload = {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema_definition: schema,
                workflow_steps: steps,
            };

            if (editingFormId) {
                await api.put(`/forms/types/${editingFormId}`, payload);
            } else {
                await api.post('/forms/types', payload);
            }

            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setBuilderSteps([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
            setEditingFormId(null);
            setTimeout(() => { setCreateSuccess(false); fetchFormTypes(); }, 2000);
        } catch (e: any) {
            console.error('Failed to save form type', e);
            alert(e.response?.data?.error || 'Failed to save the form type');
        } finally {
            setCreating(false);
        }
    };

    const handleEditFormType = (ft: FormType) => {
        setEditingFormId(ft.id);
        setNewFormName(ft.name);
        setNewFormDesc(ft.description || '');

        // Reconstruct builderSteps from schema_definition & workflow
        if (ft.schema_definition && ft.workflow) {
            const stepsMap = (ft.workflow.steps || []).map((dbStep, i) => {
                const schemaKey = String(i + 1);
                const stepSchemaArr = ft.schema_definition[schemaKey];

                // Parse fields filtering out the status element
                const fields: BuilderField[] = [];
                if (Array.isArray(stepSchemaArr)) {
                    stepSchemaArr.forEach((item: any) => {
                        if (item.name) fields.push({
                            name: item.name,
                            type: item.type || 'text',
                            required: item.required === true,
                            options: item.options,
                            min: item.min,
                            max: item.max,
                            subFields: item.subFields,
                        });
                    });
                }
                // if no fields mapped for this step yet, add a blank one
                if (fields.length === 0) fields.push({ name: '', type: 'text', required: true });

                return {
                    status: dbStep.step_name,
                    approval_roles: dbStep.approval_roles || [],
                    fields
                };
            });
            if (stepsMap.length > 0) setBuilderSteps(stepsMap);
        }

        setActiveView('create_form');
        setSelectedFormType(null);
    };

    // ─── Signature Upload ─────────────────────────────────────────────
    const handleSigUpload = async (file: File) => {
        setSigUploading(true);
        try {
            const fd = new FormData();
            fd.append('signature', file);
            const r = await api.post('/profile/signature', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setProfile(prev => prev ? { ...prev, signature_url: r.data.signature_url } : prev);
        } catch (e: any) {
            console.error('Sig upload failed', e);
            const errorMsg = e.response?.data?.error || e.message || 'Failed to upload';
            alert(`Upload failed: ${errorMsg}. Max file size is 5MB and only image formats (JPG, PNG) are supported.`);
        }
        finally { setSigUploading(false); }
    };

    const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login'); };

    const handleSidebarClick = (v: SidebarView) => {
        setActiveView(v); setSelectedFormType(null); setSelectedApp(null); setFormData({}); setSubmitSuccess(false); setSearchQuery('');
    };

    // ─── Schema field renderer ────────────────────────────────────────
    const getSchemaFields = (schema: any): FieldDef[] => {
        if (schema?.fields && Array.isArray(schema.fields)) return schema.fields;

        if (schema && typeof schema === 'object' && Array.isArray(schema['1'])) {
            const fields: FieldDef[] = [];
            schema['1'].forEach((item: any) => {
                if (item.name) {
                    fields.push({
                        key: item.name.replace(/\s+/g, '_'),
                        label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                        type: item.type || 'text',
                        required: item.required === true || item.required === 'true',
                        options: item.options,
                        min: item.min,
                        max: item.max,
                        subFields: Array.isArray(item.subFields)
                            ? item.subFields.map((sf: any) => ({
                                key: sf.name.replace(/\s+/g, '_'),
                                label: sf.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                                type: sf.type || 'text',
                            }))
                            : undefined,
                    });
                }
            });
            return fields;
        }

        if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
            return [
                { key: 'name', label: 'Full Name', type: 'text', required: true },
                { key: 'department', label: 'Department', type: 'department', required: true },
                { key: 'leave_type', label: 'Leave Type', type: 'select', required: true, options: ['Casual Leave', 'Earned Leave', 'Sick Leave'] },
                { key: 'start_date', label: 'Start Date', type: 'date', required: true },
                { key: 'end_date', label: 'End Date', type: 'date', required: true },
                { key: 'reason', label: 'Reason', type: 'textarea', required: true },
            ];
        }
        return Object.entries(schema).map(([k, v]: [string, any]) => ({
            key: k, label: v?.label || k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            type: v?.type || 'text', required: v?.required ?? false,
            options: v?.options, min: v?.min, max: v?.max,
        }));
    };

    const getApprovalFields = (schema: any, steps: any[], currentStatus: string): FieldDef[] => {
        if (!schema || typeof schema !== 'object') return [];
        const currentStep = steps.find(s => s.step_name === currentStatus);
        if (!currentStep) return [];

        const stepOrder = String(currentStep.step_order);
        const stepConfig = schema[stepOrder];

        if (Array.isArray(stepConfig)) {
            const fields: FieldDef[] = [];
            stepConfig.forEach((item: any) => {
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
        return [];
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

                {/* Search */}
                {(activeView === 'all' || activeView === 'pending' || activeView === 'new') && (
                    <div style={{ padding: '10px 16px 0' }}>
                        <input
                            type="text"
                            placeholder={activeView === 'new' ? 'Search forms...' : 'Search applications...'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
                        />
                    </div>
                )}

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', marginTop: '10px' }}>
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
                                        {(() => {
                                            const filteredForms = formTypes.filter(ft => ft.name.toLowerCase().includes(searchQuery.toLowerCase()) || ft.description?.toLowerCase().includes(searchQuery.toLowerCase()));
                                            return filteredForms.length === 0 ? <Empty msg="No forms available" /> :
                                                filteredForms.map(ft => (
                                                    <ListItem key={ft.id} sel={selectedFormType?.id === ft.id}
                                                        onClick={() => {
                                                            setSelectedFormType(ft); setSelectedApp(null); setSubmitSuccess(false);

                                                            // Pre-fill smart fields
                                                            const initialData: Record<string, any> = {};
                                                            const fields = getSchemaFields(ft.schema_definition);
                                                            fields.forEach(f => {
                                                                if (f.type === 'department' && profile?.department) {
                                                                    initialData[f.key] = profile.department;
                                                                } else if (f.type === 'role' && liveRoles.length > 0) {
                                                                    initialData[f.key] = liveRoles[0];
                                                                } else if (f.type === 'date_from_to') {
                                                                    // Default to today for 'from' and tomorrow for 'to'
                                                                    const today = new Date();
                                                                    const tomorrow = new Date(today);
                                                                    tomorrow.setDate(today.getDate() + 1);
                                                                    initialData[`${f.key}_from`] = today.toISOString().split('T')[0];
                                                                    initialData[`${f.key}_to`] = tomorrow.toISOString().split('T')[0];
                                                                }
                                                            });
                                                            setFormData(initialData);
                                                        }}>
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
                                        })()}
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
                                const baseApps = isAdmin ? applications : myApps;
                                let list = appTab === 'ongoing' ? baseApps.filter(a => !isTerminal(a.current_status)) : baseApps.filter(a => isTerminal(a.current_status));
                                if (searchQuery) list = list.filter(a => a.form_types?.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.users?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || a.users?.last_name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                                let list = appTab === 'ongoing' ? pendingApps : processedApps;
                                if (searchQuery) list = list.filter(a => a.form_types?.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.users?.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || a.users?.last_name.toLowerCase().includes(searchQuery.toLowerCase()));
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{selectedFormType.name}</h1>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleEditFormType(selectedFormType)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            <FileText size={14} /> Edit Form
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>{selectedFormType.description || 'Fill in the details below.'}</p>

                                {/* Workflow badge */}
                                {selectedFormType.workflow && selectedFormType.workflow.steps.length > 0 && (
                                    <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #ecfeff 100%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(37,99,235,0.06)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                                            <div style={{ width: '4px', height: '14px', borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #2563eb)' }} />
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Approval Workflow</span>
                                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginLeft: 'auto' }}>{selectedFormType.workflow.steps.length} steps</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
                                            {selectedFormType.workflow.steps.map((s, i) => (
                                                <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div className="group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                            color: '#fff', fontSize: '13px', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                                        }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.45)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)'; }}
                                                        >
                                                            {i + 1}
                                                        </div>
                                                        {/* Tooltip */}
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                                                            {s.step_name.replace(/_/g, ' ')}
                                                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                                                        </div>
                                                    </div>
                                                    {/* Connector line */}
                                                    {i < selectedFormType.workflow!.steps.length - 1 && (
                                                        <div style={{ width: '40px', height: '2px', background: 'linear-gradient(90deg, #93c5fd, #bfdbfe)', borderRadius: '1px', margin: '0 4px' }} />
                                                    )}
                                                </div>
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
                                                ) : f.type === 'department' ? (
                                                    <select value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                        style={{ ...inputStyle, background: '#fff' }}>
                                                        <option value="">Select Department...</option>
                                                        {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                                    </select>
                                                ) : f.type === 'role' ? (
                                                    <select value={formData[f.key] || ''} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                                                        style={{ ...inputStyle, background: '#fff' }}>
                                                        <option value="">Select Role...</option>
                                                        {availableRoles.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                ) : f.type === 'date_from_to' ? (
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <input type="date" value={formData[`${f.key}_from`] || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const currentTo = formData[`${f.key}_to`];
                                                                if (currentTo && val > currentTo) {
                                                                    alert('From Date cannot be later than To Date');
                                                                } else {
                                                                    setFormData({ ...formData, [`${f.key}_from`]: val });
                                                                }
                                                            }}
                                                            style={{ ...inputStyle, flex: 1 }} />
                                                        <span style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>to</span>
                                                        <input type="date" value={formData[`${f.key}_to`] || ''}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                const currentFrom = formData[`${f.key}_from`];
                                                                if (currentFrom && val < currentFrom) {
                                                                    alert('To Date cannot be earlier than From Date');
                                                                } else {
                                                                    setFormData({ ...formData, [`${f.key}_to`]: val });
                                                                }
                                                            }}
                                                            style={{ ...inputStyle, flex: 1 }} />
                                                    </div>
                                                ) : f.type === 'signature' ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
                                                        {profile?.signature_url ? (
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                                                                <input type="checkbox" checked={formData[f.key] === profile.signature_url}
                                                                    onChange={e => setFormData({ ...formData, [f.key]: e.target.checked ? profile.signature_url : '' })}
                                                                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                                                                Attach my saved signature
                                                                <img src={`http://localhost:4000${profile.signature_url}`} alt="Saved Signature" style={{ height: '30px', marginLeft: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px' }} />
                                                            </label>
                                                        ) : (
                                                            <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <span>No signature saved in profile.</span>
                                                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', color: '#2563eb', cursor: 'pointer', background: '#fff', fontWeight: 600 }}>
                                                                    <Upload size={12} />
                                                                    {sigUploading ? 'Uploading...' : 'Upload Now'}
                                                                    <input type="file" accept="image/*" style={{ display: 'none' }}
                                                                        onChange={async e => {
                                                                            if (e.target.files?.[0]) await handleSigUpload(e.target.files[0]);
                                                                        }} />
                                                                </label>
                                                            </div>
                                                        )}
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
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                <Badge status={selectedApp.current_status} lg />
                                {selectedApp.current_status === 'APPROVED' && (
                                    <button onClick={() => handleDownloadPdf(selectedApp.id, selectedApp.form_types?.name || 'Application')}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)', transition: 'background 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}>
                                        <FileText size={14} /> Download PDF
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Workflow progress */}
                        {selectedApp.form_types?.workflow && (() => {
                            const steps = selectedApp.form_types.workflow.steps;
                            const curIdx = steps.findIndex(s => s.step_name === selectedApp.current_status);
                            const isApproved = selectedApp.current_status === 'APPROVED';
                            const isRejected = selectedApp.current_status === 'REJECTED';
                            const isDone = isApproved || isRejected;
                            return (
                                <Panel title="Workflow Progress">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
                                        {steps.map((step, i) => {
                                            const isPast = curIdx > i || isApproved;
                                            const isCur = step.step_name === selectedApp.current_status;
                                            const circleGradient = isPast
                                                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                                : isCur
                                                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                                    : '#e5e7eb';
                                            const circleShadow = isPast
                                                ? '0 2px 8px rgba(22,163,74,0.3)'
                                                : isCur
                                                    ? '0 2px 8px rgba(37,99,235,0.35), 0 0 0 3px rgba(59,130,246,0.15)'
                                                    : 'none';
                                            const lineColor = isPast ? '#22c55e' : '#e5e7eb';
                                            return (
                                                <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div className="group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: circleGradient,
                                                            color: isPast || isCur ? '#fff' : '#9ca3af',
                                                            fontSize: isPast ? '14px' : '13px', fontWeight: 700,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            boxShadow: circleShadow,
                                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                                        }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                        >
                                                            {isPast ? '✓' : i + 1}
                                                        </div>
                                                        {/* Tooltip */}
                                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                                                            {step.step_name.replace(/_/g, ' ')}
                                                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                                                        </div>
                                                    </div>
                                                    {/* Connector line */}
                                                    {i < steps.length - 1 && (
                                                        <div style={{ width: '40px', height: '2px', background: lineColor, borderRadius: '1px', margin: '0 4px', transition: 'background 0.3s' }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {/* Final Done/Approved/Rejected node */}
                                        <div style={{ width: '40px', height: '2px', background: isDone ? (isApproved ? '#22c55e' : '#ef4444') : '#e5e7eb', borderRadius: '1px', margin: '0 4px', transition: 'background 0.3s' }} />
                                        <div className="group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: isApproved ? 'linear-gradient(135deg, #22c55e, #16a34a)' : isRejected ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
                                                color: isDone ? '#fff' : '#9ca3af',
                                                fontSize: '14px', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: isApproved ? '0 2px 8px rgba(22,163,74,0.3)' : isRejected ? '0 2px 8px rgba(239,68,68,0.3)' : 'none',
                                                transition: 'transform 0.2s',
                                            }}
                                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                            >
                                                {isApproved ? '✓' : isRejected ? '✕' : '⋯'}
                                            </div>
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                                                {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                                                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            );
                        })()}

                        {/* Form Data Grouped by Steps */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                            {(() => {
                                const panels: any[] = [];
                                const schema = selectedApp.form_types?.schema_definition || {};
                                const stepsKeys = Object.keys(schema).sort((a, b) => Number(a) - Number(b));
                                const renderedFields = new Set<string>();

                                stepsKeys.forEach(stepKey => {
                                    const stepConfig = schema[stepKey];
                                    if (Array.isArray(stepConfig) && stepConfig.length > 0) {
                                        const statusObj = stepConfig[0] || {};
                                        // Default "Draft" -> "Applicant"
                                        const panelTitle = statusObj.status === 'Draft' ? 'Applicant' : statusObj.status;

                                        let sourceData: any = {};
                                        if (stepKey === '1' || statusObj.status === 'Draft') {
                                            sourceData = selectedApp.form_data || {};
                                        } else {
                                            const approval = (selectedApp.form_approvals || []).find((a: any) => a.stage === statusObj.status && a.decision === 'APPROVED');
                                            if (approval && approval.approval_data) {
                                                sourceData = approval.approval_data;
                                            }
                                        }

                                        const fieldsInStep = stepConfig.slice(1).map((f: any) => {
                                            const normalizedName = f.name?.replace(/\s+/g, '_');
                                            if (!normalizedName) return [];

                                            if (f.type === 'date_from_to') {
                                                return [
                                                    { key: `${normalizedName}_from`, value: sourceData[`${normalizedName}_from`] },
                                                    { key: `${normalizedName}_to`, value: sourceData[`${normalizedName}_to`] }
                                                ];
                                            } else {
                                                return [{ key: normalizedName, value: sourceData[normalizedName] }];
                                            }
                                        }).flat().filter((obj: any) => obj.key && obj.value !== undefined && obj.value !== '');

                                        if (fieldsInStep.length > 0) {
                                            fieldsInStep.forEach((f: any) => renderedFields.add(f.key));

                                            panels.push(
                                                <Panel key={`step-${stepKey}`} title={panelTitle} style={{ marginBottom: 0 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                                        {fieldsInStep.map((f: any) => {
                                                            const { key: k, value: v } = f;
                                                            return (
                                                                <div key={k} style={{ gridColumn: (Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures'))) ? 'span 2' : 'auto' }}>
                                                                    <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.replace(/_/g, ' ')}</div>
                                                                    {typeof v === 'string' && v.startsWith('/uploads/signatures') ? (
                                                                        <img src={`http://localhost:4000${v}`} alt="Signature" style={{ maxHeight: '60px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', padding: '4px' }} />
                                                                    ) : Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' ? (
                                                                        <div style={{ marginTop: '6px', overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                                <thead style={{ background: '#f9fafb' }}>
                                                                                    <tr>
                                                                                        {Object.keys(v[0]).map(col => <th key={col} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>)}
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {v.map((row, idx) => (
                                                                                        <tr key={idx} style={{ borderBottom: idx === v.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                                            {Object.values(row).map((cell: any, cIdx) => <td key={cIdx} style={{ padding: '6px 8px' }}>{String(cell || '—')}</td>)}
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{String(v) || '—'}</div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </Panel>
                                            );
                                        }
                                    }
                                });

                                // Unmapped Fields
                                const unmappedFields = Object.entries(selectedApp.form_data || {}).filter(([k, v]) => !renderedFields.has(k) && v !== '' && v !== null);
                                if (unmappedFields.length > 0) {
                                    panels.push(
                                        <Panel key="unmapped" title="Other Details" style={{ marginBottom: 0 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                                {unmappedFields.map(([k, v]) => (
                                                    <div key={k} style={{ gridColumn: (Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures'))) ? 'span 2' : 'auto' }}>
                                                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.replace(/_/g, ' ')}</div>
                                                        {typeof v === 'string' && v.startsWith('/uploads/signatures') ? (
                                                            <img src={`http://localhost:4000${v}`} alt="Signature" style={{ maxHeight: '60px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', padding: '4px' }} />
                                                        ) : Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' ? (
                                                            <div style={{ marginTop: '6px', overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                    <thead style={{ background: '#f9fafb' }}>
                                                                        <tr>
                                                                            {Object.keys(v[0]).map(col => <th key={col} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>)}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {v.map((row, idx) => (
                                                                            <tr key={idx} style={{ borderBottom: idx === v.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                                {Object.values(row).map((cell: any, cIdx) => <td key={cIdx} style={{ padding: '6px 8px' }}>{String(cell || '—')}</td>)}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{String(v) || '—'}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </Panel>
                                    );
                                }

                                return panels;
                            })()}
                        </div>

                        {/* Approve / Reject */}
                        {canApprove && activeView === 'pending' && !isTerminal(selectedApp.current_status) && (
                            <Panel title="Take Action">
                                {(() => {
                                    const approvalFields = getApprovalFields(
                                        selectedApp.form_types?.schema_definition || {},
                                        selectedApp.form_types?.workflow?.steps || [],
                                        selectedApp.current_status
                                    );

                                    if (approvalFields.length > 0) {
                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                {approvalFields.map(f => (
                                                    <div key={f.key} style={{ gridColumn: f.type === 'textarea' || f.type === 'signature' ? 'span 2' : 'auto' }}>
                                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                                                            {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                        </label>
                                                        {f.type === 'textarea' ? (
                                                            <textarea value={approvalData[f.key] || ''} onChange={e => setApprovalData({ ...approvalData, [f.key]: e.target.value })} rows={3} style={inputStyle} />
                                                        ) : f.type === 'select' ? (
                                                            <select value={approvalData[f.key] || ''} onChange={e => setApprovalData({ ...approvalData, [f.key]: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
                                                                <option value="">Select...</option>
                                                                {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                                                            </select>
                                                        ) : f.type === 'bool' ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 8px' }}>
                                                                <input type="checkbox" checked={approvalData[f.key] === true || approvalData[f.key] === 'true'} onChange={e => setApprovalData({ ...approvalData, [f.key]: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }} />
                                                                <span style={{ marginLeft: '10px', fontSize: '13px', color: '#4b5563' }}>{f.label}</span>
                                                            </div>
                                                        ) : f.type === 'signature' ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
                                                                {profile?.signature_url ? (
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                                                                        <input type="checkbox" checked={approvalData[f.key] === profile.signature_url} onChange={e => setApprovalData({ ...approvalData, [f.key]: e.target.checked ? profile.signature_url : '' })} style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                                                                        Attach my saved signature
                                                                        <img src={`http://localhost:4000${profile.signature_url}`} alt="Saved Signature" style={{ height: '30px', marginLeft: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2px' }} />
                                                                    </label>
                                                                ) : (
                                                                    <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <span>No signature saved in profile.</span>
                                                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', color: '#2563eb', cursor: 'pointer', background: '#fff', fontWeight: 600 }}>
                                                                            <Upload size={12} />
                                                                            {sigUploading ? 'Uploading...' : 'Upload Now'}
                                                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { if (e.target.files?.[0]) await handleSigUpload(e.target.files[0]); }} />
                                                                        </label>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input type={f.type} value={approvalData[f.key] || ''} onChange={e => setApprovalData({ ...approvalData, [f.key]: e.target.value })} style={inputStyle} />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
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
                {
                    activeView === 'create_form' && (
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <label style={{ ...labelStyle, marginBottom: 0 }}>Approval Roles</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSteps = [...builderSteps];
                                                            newSteps[stepIndex].showAllRoles = !newSteps[stepIndex].showAllRoles;
                                                            setBuilderSteps(newSteps);
                                                        }}
                                                        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                    >
                                                        {step.showAllRoles ? <ChevronDown size={14} style={{ marginRight: '4px' }} /> : <ChevronRight size={14} style={{ marginRight: '4px' }} />}
                                                        {step.showAllRoles ? 'Hide extra roles' : 'Show all roles'}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px' }}>
                                                    {availableRoles.length === 0 && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading roles...</span>}
                                                    {availableRoles.map(role => {
                                                        const isPrimary = ['HEAD_OF_DEPARTMENT', 'SECTION_INCHARGE', 'AR_DR_ESTT', 'REGISTRAR'].includes(role);
                                                        const selected = step.approval_roles.includes(role);

                                                        if (!step.showAllRoles && !isPrimary && !selected) return null;

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
                                                <div key={fieldIndex} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: fieldIndex < step.fields.length - 1 ? '1px dashed #d1d5db' : 'none' }}>
                                                    {/* Row 1: name / type / required / delete */}
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
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
                                                                {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</option>)}
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
                                                                    if (window.confirm('Remove this field?')) {
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
                                                    {/* Row 2: contextual config */}
                                                    {field.type === 'select' && (
                                                        <div style={{ marginTop: '8px' }}>
                                                            <label style={labelStyle}>Options</label>
                                                            {(field.options || []).map((opt, optIdx) => (
                                                                <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                    <input
                                                                        value={opt}
                                                                        onChange={e => {
                                                                            const newSteps = [...builderSteps];
                                                                            const opts = [...(newSteps[stepIndex].fields[fieldIndex].options || [])];
                                                                            opts[optIdx] = e.target.value;
                                                                            newSteps[stepIndex].fields[fieldIndex].options = opts;
                                                                            setBuilderSteps(newSteps);
                                                                        }}
                                                                        placeholder={`Option ${optIdx + 1}`}
                                                                        style={{ ...inputStyleSm, flex: 1 }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newSteps = [...builderSteps];
                                                                            const opts = [...(newSteps[stepIndex].fields[fieldIndex].options || [])];
                                                                            opts.splice(optIdx, 1);
                                                                            newSteps[stepIndex].fields[fieldIndex].options = opts;
                                                                            setBuilderSteps(newSteps);
                                                                        }}
                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                                                                        title="Remove option"
                                                                    >×</button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newSteps = [...builderSteps];
                                                                    const opts = [...(newSteps[stepIndex].fields[fieldIndex].options || []), ''];
                                                                    newSteps[stepIndex].fields[fieldIndex].options = opts;
                                                                    setBuilderSteps(newSteps);
                                                                }}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                <Plus size={11} /> Add Option
                                                            </button>
                                                        </div>
                                                    )}
                                                    {field.type === 'number' && (
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={labelStyle}>Min value</label>
                                                                <input type="number" value={field.min ?? ''} onChange={e => {
                                                                    const newSteps = [...builderSteps];
                                                                    newSteps[stepIndex].fields[fieldIndex].min = e.target.value === '' ? undefined : Number(e.target.value);
                                                                    setBuilderSteps(newSteps);
                                                                }} style={inputStyleSm} placeholder="e.g. 0" />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={labelStyle}>Max value</label>
                                                                <input type="number" value={field.max ?? ''} onChange={e => {
                                                                    const newSteps = [...builderSteps];
                                                                    newSteps[stepIndex].fields[fieldIndex].max = e.target.value === '' ? undefined : Number(e.target.value);
                                                                    setBuilderSteps(newSteps);
                                                                }} style={inputStyleSm} placeholder="optional" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {(field.type === 'tuple' || field.type === 'list') && (
                                                        <div style={{ marginTop: '8px', background: '#f0f4ff', borderRadius: '6px', padding: '10px 12px' }}>
                                                            <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>
                                                                Columns
                                                            </label>
                                                            {(field.subFields || []).map((sf, sfIdx) => (
                                                                <div key={sfIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <input
                                                                        value={sf.name}
                                                                        onChange={e => {
                                                                            const newSteps = [...builderSteps];
                                                                            const sfs = [...(newSteps[stepIndex].fields[fieldIndex].subFields || [])];
                                                                            sfs[sfIdx] = { ...sfs[sfIdx], name: e.target.value };
                                                                            newSteps[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                            setBuilderSteps(newSteps);
                                                                        }}
                                                                        placeholder="Column name"
                                                                        style={{ ...inputStyleSm, flex: 2 }}
                                                                    />
                                                                    <select
                                                                        value={sf.type}
                                                                        onChange={e => {
                                                                            const newSteps = [...builderSteps];
                                                                            const sfs = [...(newSteps[stepIndex].fields[fieldIndex].subFields || [])];
                                                                            sfs[sfIdx] = { ...sfs[sfIdx], type: e.target.value };
                                                                            newSteps[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                            setBuilderSteps(newSteps);
                                                                        }}
                                                                        style={{ ...inputStyleSm, flex: 1, background: '#fff' }}
                                                                    >
                                                                        {['text', 'number', 'date', 'bool', 'select'].map(t => (
                                                                            <option key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newSteps = [...builderSteps];
                                                                            const sfs = [...(newSteps[stepIndex].fields[fieldIndex].subFields || [])];
                                                                            sfs.splice(sfIdx, 1);
                                                                            newSteps[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                            setBuilderSteps(newSteps);
                                                                        }}
                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}
                                                                        title="Remove column"
                                                                    >×</button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newSteps = [...builderSteps];
                                                                    const sfs = [...(newSteps[stepIndex].fields[fieldIndex].subFields || []), { name: '', type: 'text' }];
                                                                    newSteps[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                    setBuilderSteps(newSteps);
                                                                }}
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', background: '#e0e7ff', border: '1px solid #a5b4fc', color: '#3730a3', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                            >
                                                                <Plus size={11} /> Add Column
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => {
                                                    const newSteps = [...builderSteps];
                                                    newSteps[stepIndex].fields.push({ name: '', type: 'text', required: true });
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
                                        setBuilderSteps([...builderSteps, { status: '', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
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
                {
                    activeView === 'profile' && (
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
                    )
                }
            </main >
        </div >
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

function Panel({ title, children, style = {} }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb', ...style }}>
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

// ─── SignaturePad ────────────────────────────────────────────────────────────
function SignaturePad({ fieldKey, value, onChange }: { fieldKey: string; value: string; onChange: (val: string) => void }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const drawing = React.useRef(false);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        if (value) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = value;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const scaleX = canvasRef.current!.width / rect.width;
        const scaleY = canvasRef.current!.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        drawing.current = true;
        const ctx = canvasRef.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current!.getContext('2d')!;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const endDraw = () => {
        if (!drawing.current) return;
        drawing.current = false;
        onChange(canvasRef.current!.toDataURL());
    };

    const clear = () => {
        const canvas = canvasRef.current!;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        onChange('');
    };

    return (
        <div>
            <canvas
                ref={canvasRef}
                width={600} height={140}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                style={{ border: '1px solid #d1d5db', borderRadius: '8px', background: '#fafafa', cursor: 'crosshair', width: '100%', height: '140px', display: 'block' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Draw your signature above</span>
                <button type="button" onClick={clear} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
            </div>
            {value && <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px' }}>✓ Signature captured</div>}
        </div>
    );
}

// ─── ListField ───────────────────────────────────────────────────────────────
function ListField({ fieldKey, subFields, value, onChange }: {
    fieldKey: string;
    subFields: { key: string; label: string; type: string }[];
    value: Record<string, any>[];
    onChange: (val: Record<string, any>[]) => void;
}) {
    const addRow = () => onChange([...value, {}]);
    const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const updateCell = (rowIdx: number, colKey: string, val: any) =>
        onChange(value.map((row, i) => i === rowIdx ? { ...row, [colKey]: val } : row));

    if (subFields.length === 0) return (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>No sub-fields defined. Configure them in the Form Builder.</div>
    );

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ background: '#f9fafb' }}>
                        {subFields.map(sf => (
                            <th key={sf.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                                {sf.label}
                            </th>
                        ))}
                        <th style={{ width: '36px', borderBottom: '1px solid #e5e7eb' }} />
                    </tr>
                </thead>
                <tbody>
                    {value.length === 0 && (
                        <tr><td colSpan={subFields.length + 1} style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>No entries yet. Click "Add Row" below.</td></tr>
                    )}
                    {value.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            {subFields.map(sf => (
                                <td key={sf.key} style={{ padding: '5px 6px' }}>
                                    <input
                                        type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                                        value={row[sf.key] ?? ''}
                                        onChange={e => updateCell(rowIdx, sf.key, e.target.value)}
                                        style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' as const }}
                                    />
                                </td>
                            ))}
                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                <button type="button" onClick={() => removeRow(rowIdx)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="button" onClick={addRow}
                style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={12} /> Add Row
            </button>
        </div>
    );
}

