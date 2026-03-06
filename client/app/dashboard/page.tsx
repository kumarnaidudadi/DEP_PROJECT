'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    FilePlus, FileText, Clock, CheckCircle, XCircle, LogOut,
    ChevronRight, Loader2, Send, ClipboardList, AlertCircle, Building2
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

type SidebarView = 'new' | 'all' | 'pending';
type AppTab = 'ongoing' | 'completed';

// ─── Main Dashboard ─────────────────────────────────────────────────────

export default function Dashboard() {
    const router = useRouter();

    // Auth state
    const [user, setUser] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    // Navigation
    const [activeView, setActiveView] = useState<SidebarView>('new');
    const [appTab, setAppTab] = useState<AppTab>('ongoing');

    // Data
    const [formTypes, setFormTypes] = useState<FormType[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection
    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    // Form submission state
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Approval state
    const [remarks, setRemarks] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // ─── Auth Check ───────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        const userData = localStorage.getItem('user');
        if (userData) {
            const parsed = JSON.parse(userData);
            setUser(parsed);
            setUserRoles(parsed.roles || []);
        }
    }, [router]);

    // ─── Data Fetching ────────────────────────────────────────────────
    const fetchFormTypes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/forms/types');
            setFormTypes(res.data);
        } catch (error) {
            console.error('Failed to fetch form types', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/forms');
            setApplications(res.data);
        } catch (error) {
            console.error('Failed to fetch applications', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeView === 'new') fetchFormTypes();
        else fetchApplications();
    }, [activeView, fetchFormTypes, fetchApplications]);

    // ─── Helpers ──────────────────────────────────────────────────────
    const isAdmin = userRoles.includes('ADMIN') || userRoles.includes('HOD') || userRoles.includes('APPROVER');

    const isTerminalStatus = (status: string) =>
        ['APPROVED', 'REJECTED'].includes(status);

    const myApps = applications.filter(a => a.submitted_by === user?.id);
    const ongoingApps = myApps.filter(a => !isTerminalStatus(a.current_status));
    const completedApps = myApps.filter(a => isTerminalStatus(a.current_status));

    const pendingApps = applications.filter(a => !isTerminalStatus(a.current_status));
    const processedApps = applications.filter(a => isTerminalStatus(a.current_status));

    // ─── Form Submission ──────────────────────────────────────────────
    const handleFormSubmit = async () => {
        if (!selectedFormType) return;
        setSubmitting(true);
        setSubmitSuccess(false);
        try {
            await api.post('/forms', {
                form_type_id: selectedFormType.id,
                form_data: formData,
            });
            setSubmitSuccess(true);
            setFormData({});
            setTimeout(() => {
                setSelectedFormType(null);
                setSubmitSuccess(false);
                setActiveView('all');
                setAppTab('ongoing');
                fetchApplications();
            }, 1500);
        } catch (error) {
            console.error('Submit failed', error);
            alert('Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Approve / Reject ─────────────────────────────────────────────
    const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await api.patch(`/forms/${selectedApp.id}/status`, { decision, remarks });
            setRemarks('');
            setSelectedApp(null);
            fetchApplications();
        } catch (error) {
            console.error('Decision failed', error);
            alert('Failed to update application');
        } finally {
            setActionLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    // ─── Sidebar click ────────────────────────────────────────────────
    const handleSidebarClick = (view: SidebarView) => {
        setActiveView(view);
        setSelectedFormType(null);
        setSelectedApp(null);
        setFormData({});
        setSubmitSuccess(false);
    };

    // ─── Schema field renderer ────────────────────────────────────────
    const getSchemaFields = (schema: any): { key: string; label: string; type: string; options?: string[] }[] => {
        if (!schema || typeof schema !== 'object') {
            // Default leave form fields
            return [
                { key: 'name', label: 'Full Name', type: 'text' },
                { key: 'roll_no', label: 'Roll No / Employee ID', type: 'text' },
                { key: 'department', label: 'Department', type: 'text' },
                { key: 'leave_type', label: 'Leave Type', type: 'select', options: ['Casual Leave', 'Earned Leave', 'Sick Leave', 'Restricted Holiday'] },
                { key: 'start_date', label: 'Start Date', type: 'date' },
                { key: 'end_date', label: 'End Date', type: 'date' },
                { key: 'reason', label: 'Reason', type: 'textarea' },
            ];
        }
        if (Array.isArray(schema.fields)) return schema.fields;
        // If schema is a map of field definitions
        return Object.entries(schema).map(([key, val]: [string, any]) => ({
            key,
            label: val?.label || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
            type: val?.type || 'text',
            options: val?.options,
        }));
    };

    // ═══════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f5f7fa', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

            {/* ─── LEFT SIDEBAR (10%) ──────────────────────────────────── */}
            <aside style={{
                width: '220px',
                minWidth: '200px',
                background: 'linear-gradient(180deg, #1e3a5f 0%, #162d4a 100%)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
            }}>
                {/* Logo */}
                <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Building2 size={28} style={{ color: '#60a5fa' }} />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px' }}>IIT ROPAR</div>
                            <div style={{ fontSize: '11px', opacity: 0.7 }}>DEP Portal</div>
                        </div>
                    </div>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, padding: '12px 0' }}>
                    <SidebarItem
                        icon={<FilePlus size={18} />}
                        label="New Application"
                        active={activeView === 'new'}
                        onClick={() => handleSidebarClick('new')}
                    />
                    <SidebarItem
                        icon={<FileText size={18} />}
                        label="All Applications"
                        active={activeView === 'all'}
                        onClick={() => handleSidebarClick('all')}
                    />
                    {isAdmin && (
                        <SidebarItem
                            icon={<ClipboardList size={18} />}
                            label="Pending Work"
                            active={activeView === 'pending'}
                            onClick={() => handleSidebarClick('pending')}
                            badge={pendingApps.length > 0 ? pendingApps.length : undefined}
                        />
                    )}
                </nav>

                {/* User section */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>
                        {user?.name || user?.first_name || 'User'}
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            width: '100%',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* ─── MIDDLE PANEL (Side Panel ~25%) ──────────────────────── */}
            <div style={{
                width: '300px',
                minWidth: '260px',
                background: '#fff',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Panel Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#fafbfc',
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                        {activeView === 'new' && 'Available Forms'}
                        {activeView === 'all' && 'My Applications'}
                        {activeView === 'pending' && 'Pending Work'}
                    </h2>
                </div>

                {/* Toggle tabs for all / pending views */}
                {(activeView === 'all' || activeView === 'pending') && (
                    <div style={{ display: 'flex', padding: '12px 16px 0', gap: '4px' }}>
                        <TabButton
                            label={activeView === 'pending' ? 'Pending' : 'Ongoing'}
                            active={appTab === 'ongoing'}
                            onClick={() => setAppTab('ongoing')}
                        />
                        <TabButton
                            label="Completed"
                            active={appTab === 'completed'}
                            onClick={() => setAppTab('completed')}
                        />
                    </div>
                )}

                {/* List content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: '#9ca3af' }} />
                        </div>
                    ) : activeView === 'new' ? (
                        /* ─── Form Type List ─── */
                        formTypes.length === 0 ? (
                            <EmptyState message="No form types found" />
                        ) : (
                            formTypes.map(ft => (
                                <ListItem
                                    key={ft.id}
                                    selected={selectedFormType?.id === ft.id}
                                    onClick={() => { setSelectedFormType(ft); setSelectedApp(null); setFormData({}); setSubmitSuccess(false); }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '8px',
                                            background: selectedFormType?.id === ft.id ? '#dbeafe' : '#f3f4f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <FileText size={16} style={{ color: selectedFormType?.id === ft.id ? '#2563eb' : '#6b7280' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{ft.name}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ft.description || 'Click to fill'}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} style={{ color: '#d1d5db' }} />
                                </ListItem>
                            ))
                        )
                    ) : activeView === 'all' ? (
                        /* ─── My Applications List ─── */
                        (() => {
                            const list = appTab === 'ongoing' ? ongoingApps : completedApps;
                            return list.length === 0 ? (
                                <EmptyState message={`No ${appTab} applications`} />
                            ) : (
                                list.map(app => (
                                    <ListItem
                                        key={app.id}
                                        selected={selectedApp?.id === app.id}
                                        onClick={() => { setSelectedApp(app); setSelectedFormType(null); }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                                {app.form_types?.name || 'Application'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                        <StatusBadge status={app.current_status} />
                                    </ListItem>
                                ))
                            );
                        })()
                    ) : (
                        /* ─── Pending Work (Admin/HOD) ─── */
                        (() => {
                            const list = appTab === 'ongoing' ? pendingApps : processedApps;
                            return list.length === 0 ? (
                                <EmptyState message={`No ${appTab === 'ongoing' ? 'pending' : 'completed'} items`} />
                            ) : (
                                list.map(app => (
                                    <ListItem
                                        key={app.id}
                                        selected={selectedApp?.id === app.id}
                                        onClick={() => { setSelectedApp(app); setSelectedFormType(null); }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                                {app.users ? `${app.users.first_name} ${app.users.last_name}` : 'Unknown'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                {app.form_types?.name || 'Application'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                                {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </div>
                                        </div>
                                        <StatusBadge status={app.current_status} />
                                    </ListItem>
                                ))
                            );
                        })()
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANEL (Details Panel ~65%) ────────────────────── */}
            <main style={{
                flex: 1,
                overflowY: 'auto',
                background: '#f8fafc',
            }}>
                {!selectedFormType && !selectedApp ? (
                    /* ─── WELCOME SCREEN ─── */
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '40px',
                    }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px',
                            boxShadow: '0 8px 32px rgba(37,99,235,0.2)',
                        }}>
                            <Building2 size={48} style={{ color: '#fff' }} />
                        </div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#1e3a5f',
                            margin: '0 0 8px',
                            letterSpacing: '-0.5px',
                        }}>
                            IIT ROPAR
                        </h1>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 500,
                            color: '#6b7280',
                            margin: 0,
                        }}>
                            Leave Forms &amp; Application Portal
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            marginTop: '16px',
                            maxWidth: '360px',
                            lineHeight: '1.6',
                        }}>
                            Select an option from the sidebar to get started. You can create new applications, track existing ones, or review pending requests.
                        </p>
                    </div>
                ) : selectedFormType ? (
                    /* ─── FORM FILL VIEW ─── */
                    <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
                        {submitSuccess ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '60px 20px',
                            }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: '#dcfce7',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 20px',
                                }}>
                                    <CheckCircle size={32} style={{ color: '#16a34a' }} />
                                </div>
                                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937' }}>
                                    Application Submitted!
                                </h2>
                                <p style={{ color: '#6b7280', marginTop: '8px' }}>
                                    Redirecting to your applications...
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '28px' }}>
                                    <h1 style={{
                                        fontSize: '24px',
                                        fontWeight: 700,
                                        color: '#1f2937',
                                        margin: '0 0 6px',
                                    }}>
                                        {selectedFormType.name}
                                    </h1>
                                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                                        {selectedFormType.description || 'Fill in the details below and submit your application.'}
                                    </p>
                                </div>

                                {/* Workflow Steps Indicator */}
                                {selectedFormType.workflow && selectedFormType.workflow.steps.length > 0 && (
                                    <div style={{
                                        background: '#f0f9ff',
                                        borderRadius: '10px',
                                        padding: '14px 18px',
                                        marginBottom: '24px',
                                        border: '1px solid #bae6fd',
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#0369a1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Approval Workflow
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            {selectedFormType.workflow.steps.map((step, i) => (
                                                <span key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        color: '#1e40af',
                                                        fontWeight: 500,
                                                        background: '#dbeafe',
                                                        padding: '3px 10px',
                                                        borderRadius: '12px',
                                                    }}>
                                                        {step.step_name.replace(/_/g, ' ')}
                                                    </span>
                                                    {i < selectedFormType.workflow!.steps.length - 1 && (
                                                        <ChevronRight size={12} style={{ color: '#93c5fd' }} />
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Form Fields */}
                                <div style={{
                                    background: '#fff',
                                    borderRadius: '12px',
                                    padding: '28px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                                    border: '1px solid #e5e7eb',
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {getSchemaFields(selectedFormType.schema_definition).map(field => (
                                            <div key={field.key} style={{
                                                gridColumn: (field.type === 'textarea') ? 'span 2' : 'auto',
                                            }}>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    color: '#374151',
                                                    marginBottom: '6px',
                                                }}>
                                                    {field.label}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        value={formData[field.key] || ''}
                                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                        rows={3}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            resize: 'vertical',
                                                            outline: 'none',
                                                            transition: 'border-color 0.2s',
                                                            boxSizing: 'border-box',
                                                        }}
                                                        onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                                        onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        value={formData[field.key] || ''}
                                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            background: '#fff',
                                                            boxSizing: 'border-box',
                                                        }}
                                                    >
                                                        <option value="">Select...</option>
                                                        {(field.options || []).map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        value={formData[field.key] || ''}
                                                        onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            outline: 'none',
                                                            transition: 'border-color 0.2s',
                                                            boxSizing: 'border-box',
                                                        }}
                                                        onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
                                                        onBlur={e => e.currentTarget.style.borderColor = '#d1d5db'}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                        <button
                                            onClick={() => { setSelectedFormType(null); setFormData({}); }}
                                            style={{
                                                padding: '10px 24px',
                                                border: '1px solid #d1d5db',
                                                background: '#fff',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                color: '#6b7280',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleFormSubmit}
                                            disabled={submitting}
                                            style={{
                                                padding: '10px 28px',
                                                border: 'none',
                                                background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                                                color: '#fff',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                cursor: submitting ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                            }}
                                        >
                                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                            {submitting ? 'Submitting...' : 'Submit Application'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : selectedApp ? (
                    /* ─── APPLICATION DETAIL VIEW ─── */
                    <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                                        {selectedApp.form_types?.name || 'Application'} #{selectedApp.id}
                                    </h1>
                                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                                        Submitted by {selectedApp.users ? `${selectedApp.users.first_name} ${selectedApp.users.last_name}` : 'Unknown'}
                                        {' · '}
                                        {new Date(selectedApp.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <StatusBadge status={selectedApp.current_status} large />
                            </div>
                        </div>

                        {/* Workflow Progress */}
                        {selectedApp.form_types?.workflow && (
                            <div style={{
                                background: '#fff',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px',
                                border: '1px solid #e5e7eb',
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Workflow Progress
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                    {selectedApp.form_types.workflow.steps.map((step, i) => {
                                        const steps = selectedApp.form_types!.workflow!.steps;
                                        const currentIdx = steps.findIndex(s => s.step_name === selectedApp.current_status);
                                        const stepIdx = i;
                                        const isPast = currentIdx > stepIdx || selectedApp.current_status === 'APPROVED';
                                        const isCurrent = step.step_name === selectedApp.current_status;
                                        const isRejected = selectedApp.current_status === 'REJECTED';

                                        return (
                                            <span key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: isCurrent ? 700 : 500,
                                                    color: isRejected ? '#dc2626' : isPast ? '#16a34a' : isCurrent ? '#2563eb' : '#9ca3af',
                                                    background: isPast ? '#dcfce7' : isCurrent ? '#dbeafe' : '#f3f4f6',
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    border: isCurrent ? '1px solid #93c5fd' : '1px solid transparent',
                                                }}>
                                                    {isPast && <CheckCircle size={10} style={{ marginRight: '4px', display: 'inline' }} />}
                                                    {step.step_name.replace(/_/g, ' ')}
                                                </span>
                                                {i < steps.length - 1 && (
                                                    <ChevronRight size={12} style={{ color: '#d1d5db' }} />
                                                )}
                                            </span>
                                        );
                                    })}
                                    {/* Final status */}
                                    <ChevronRight size={12} style={{ color: '#d1d5db' }} />
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: selectedApp.current_status === 'APPROVED' ? 700 : 500,
                                        color: selectedApp.current_status === 'APPROVED' ? '#16a34a' : selectedApp.current_status === 'REJECTED' ? '#dc2626' : '#9ca3af',
                                        background: selectedApp.current_status === 'APPROVED' ? '#dcfce7' : selectedApp.current_status === 'REJECTED' ? '#fee2e2' : '#f3f4f6',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                    }}>
                                        {isTerminalStatus(selectedApp.current_status) ? selectedApp.current_status : 'Done'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Form Data */}
                        <div style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginBottom: '20px',
                            border: '1px solid #e5e7eb',
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Application Details
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {Object.entries(selectedApp.form_data || {}).map(([key, value]) => (
                                    <div key={key} style={{
                                        gridColumn: String(value).length > 50 ? 'span 2' : 'auto',
                                    }}>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {key.replace(/_/g, ' ')}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                                            {String(value) || '—'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Approve / Reject (for admins on pending items) */}
                        {isAdmin && activeView === 'pending' && !isTerminalStatus(selectedApp.current_status) && (
                            <div style={{
                                background: '#fff',
                                borderRadius: '12px',
                                padding: '24px',
                                border: '1px solid #e5e7eb',
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Take Action
                                </div>
                                <textarea
                                    placeholder="Add remarks (optional)..."
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'none',
                                        outline: 'none',
                                        marginBottom: '16px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => handleDecision('REJECTED')}
                                        disabled={actionLoading}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            border: '1px solid #fca5a5',
                                            background: '#fff',
                                            color: '#dc2626',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <XCircle size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleDecision('APPROVED')}
                                        disabled={actionLoading}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #16a34a, #15803d)',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
                                        }}
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </main>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════

function SidebarItem({ icon, label, active, onClick, badge }: {
    icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 20px',
                border: 'none',
                background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
                transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
            {icon}
            <span style={{ flex: 1 }}>{label}</span>
            {badge && (
                <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                }}>
                    {badge}
                </span>
            )}
        </button>
    );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                background: active ? '#2563eb' : '#f3f4f6',
                color: active ? '#fff' : '#6b7280',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
            }}
        >
            {label}
        </button>
    );
}

function ListItem({ children, selected, onClick }: {
    children: React.ReactNode; selected: boolean; onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                cursor: 'pointer',
                background: selected ? '#eff6ff' : '#fff',
                borderLeft: selected ? '3px solid #2563eb' : '3px solid transparent',
                borderBottom: '1px solid #f3f4f6',
                transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f9fafb'; }}
            onMouseLeave={e => { if (!selected) e.currentTarget.style.background = '#fff'; }}
        >
            {children}
        </div>
    );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
    const isApproved = status === 'APPROVED';
    const isRejected = status === 'REJECTED';

    const bg = isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7';
    const color = isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#d97706';
    const Icon = isApproved ? CheckCircle : isRejected ? XCircle : Clock;
    const label = isApproved ? 'Approved' : isRejected ? 'Rejected' : status.replace(/_/g, ' ');

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: bg,
            color,
            fontSize: large ? '13px' : '11px',
            fontWeight: 600,
            padding: large ? '5px 14px' : '3px 10px',
            borderRadius: '12px',
            whiteSpace: 'nowrap',
        }}>
            <Icon size={large ? 14 : 10} />
            {label}
        </span>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#9ca3af',
        }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '13px', margin: 0 }}>{message}</p>
        </div>
    );
}
