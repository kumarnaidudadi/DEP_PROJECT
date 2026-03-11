'use client';
// ─── Dashboard Page ────────────────────────────────────────────────────────────
// Slim orchestrator: ~200 lines of pure composition. All business logic lives in
// hooks (useAuth, useForms, useProfile) and service layer.

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Search } from 'lucide-react';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';

// Types
import { FormType, Application, BuilderStep, SidebarView, AppTab, getSchemaFields } from '@/types';

// Services (only those not abstracted into hooks)
import * as formTypeSvc from '@/services/formTypeService';

// Dashboard sub-components
import Sidebar from '@/components/dashboard/Sidebar';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';

// Views
import NewApplicationView from '@/components/dashboard/views/NewApplicationView';
import AllApplicationsView from '@/components/dashboard/views/AllApplicationsView';
import PendingWorkView from '@/components/dashboard/views/PendingWorkView';
import ApplicationDetail from '@/components/dashboard/views/ApplicationDetail';
import CreateFormView from '@/components/dashboard/views/CreateFormView';
import ProfileView from '@/components/dashboard/views/ProfileView';

// ──────────────────────────────────────────────────────────────────────────────

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function Dashboard() {
    const { user, userRoles, logout } = useAuth();
    const {
        formTypes, setFormTypes, applications, setApplications, loading,
        fetchFormTypes, fetchApplications, submitForm, makeDecision, triggerDownloadPdf,
    } = useForms();
    const {
        profile, setProfile, availableRoles, availableDepartments,
        sigUploading, fetchProfile, fetchRoles, fetchDepartments, handleSigUpload,
    } = useProfile();

    // ── Navigation state ──────────────────────────────────────────────────────
    const [activeView, setActiveView] = useState<SidebarView>('dashboard');
    const [appTab, setAppTab] = useState<AppTab>('ongoing');
    const [searchQuery, setSearchQuery] = useState('');

    // ── Selection state ───────────────────────────────────────────────────────
    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    // ── Form submission state ─────────────────────────────────────────────────
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // ── Approval state ────────────────────────────────────────────────────────
    const [remarks, setRemarks] = useState('');
    const [approvalData, setApprovalData] = useState<Record<string, any>>({});
    const [actionLoading, setActionLoading] = useState(false);

    // ── Form builder state ────────────────────────────────────────────────────
    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([
        { status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] },
    ]);
    const [creating, setCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [editingFormId, setEditingFormId] = useState<number | null>(null);

    // ── Data fetching on navigate ─────────────────────────────────────────────
    useEffect(() => {
        if (activeView === 'new' || activeView === 'create_form') {
            fetchFormTypes();
            fetchRoles();
            fetchDepartments();
        } else if (activeView === 'all' || activeView === 'pending' || activeView === 'dashboard') {
            fetchApplications();
        } else if (activeView === 'profile') {
            fetchProfile();
            fetchRoles();
        }
    }, [activeView, fetchFormTypes, fetchApplications, fetchProfile, fetchRoles, fetchDepartments]);

    // ── Role helpers ──────────────────────────────────────────────────────────
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const allRoles = [...new Set([...liveRoles, ...storedRoles])];
    const isAdmin = allRoles.includes('ADMIN');
    const NON_APPROVER_ROLES = ['STAFF', 'INSTRUCTOR'];
    const canApprove = allRoles.length > 0 && !allRoles.every(r => NON_APPROVER_ROLES.includes(r));

    // ── Derived data ──────────────────────────────────────────────────────────
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

    // ── Navigation ────────────────────────────────────────────────────────────
    const handleSidebarClick = (v: SidebarView) => {
        setActiveView(v);
        setSelectedFormType(null);
        setSelectedApp(null);
        setFormData({});
        setSubmitSuccess(false);
        setSearchQuery('');
        setRemarks('');
        setApprovalData({});
    };

    // ── Form submit ───────────────────────────────────────────────────────────
    const handleFormSubmit = async () => {
        if (!selectedFormType) return;
        const schemaFields = getSchemaFields(selectedFormType.schema_definition);
        const missing = schemaFields.filter(f => {
            if (!f.required) return false;
            if (f.type === 'date_from_to') return !formData[`${f.key}_from`] || !formData[`${f.key}_to`];
            return !formData[f.key];
        }).map(f => f.label);

        if (missing.length > 0) { alert(`Please fill in:\n- ${missing.join('\n- ')}`); return; }

        setSubmitting(true);
        try {
            await submitForm(selectedFormType.id, formData);
            setSubmitSuccess(true);
            setFormData({});
            setTimeout(() => {
                setSubmitSuccess(false);
                setSelectedFormType(null);
                setActiveView('all');
                setAppTab('ongoing');
                fetchApplications();
            }, 1500);
        } catch { alert('Failed to submit'); }
        finally { setSubmitting(false); }
    };

    // ── Approve / Reject ──────────────────────────────────────────────────────
    const handleDecision = async (decision: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        setActionLoading(true);
        try {
            await makeDecision(selectedApp.id, decision, remarks, approvalData);
            setRemarks(''); setApprovalData({}); setSelectedApp(null);
            fetchApplications();
        } catch { alert('Failed to update'); }
        finally { setActionLoading(false); }
    };

    // ── Download PDF ──────────────────────────────────────────────────────────
    const handleDownloadPdf = (id: number, name: string) => {
        triggerDownloadPdf(id, `${name.replace(/\s+/g, '_')}_${id}.pdf`);
    };

    // ── Create / Edit form type ───────────────────────────────────────────────
    const handleSaveFormType = async () => {
        if (!newFormName.trim()) { alert('Form name is required'); return; }
        setCreating(true); setCreateSuccess(false);
        try {
            const schema: any = {};
            builderSteps.forEach((s, i) => {
                schema[String(i + 1)] = [
                    { status: s.status },
                    ...s.fields.filter(f => f.name.trim()).map(f => ({
                        name: f.name.trim(), type: f.type, required: f.required,
                        ...(f.options?.length ? { options: f.options.filter(Boolean) } : {}),
                        ...(f.min !== undefined ? { min: f.min } : {}),
                        ...(f.max !== undefined ? { max: f.max } : {}),
                        ...(f.subFields?.length ? { subFields: f.subFields } : {}),
                    })),
                ];
            });
            const payload = {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema_definition: schema,
                workflow_steps: builderSteps.map((s, i) => ({
                    step_name: s.status,
                    approval_roles: s.approval_roles,
                    is_terminal: i === builderSteps.length - 1,
                })),
            };
            if (editingFormId) { await formTypeSvc.updateFormType(editingFormId, payload); }
            else { await formTypeSvc.createFormType(payload); }
            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setBuilderSteps([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
            setEditingFormId(null);
            setTimeout(() => { setCreateSuccess(false); fetchFormTypes(); }, 2000);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to save the form type');
        } finally { setCreating(false); }
    };

    const handleEditFormType = (ft: FormType) => {
        setEditingFormId(ft.id);
        setNewFormName(ft.name);
        setNewFormDesc(ft.description || '');
        if (ft.schema_definition && ft.workflow) {
            const stepsMap = (ft.workflow.steps || []).map((dbStep, i) => {
                const stepSchemaArr = ft.schema_definition[String(i + 1)];
                const fields = Array.isArray(stepSchemaArr)
                    ? stepSchemaArr.filter((item: any) => item.name).map((item: any) => ({
                        name: item.name, type: item.type || 'text',
                        required: item.required === true,
                        options: item.options, min: item.min, max: item.max, subFields: item.subFields,
                    }))
                    : [{ name: '', type: 'text', required: true }];
                return { status: dbStep.step_name, approval_roles: dbStep.approval_roles || [], fields };
            });
            if (stepsMap.length > 0) setBuilderSteps(stepsMap);
        }
        setActiveView('create_form');
        setSelectedFormType(null);
    };

    // ── Determine which middle/right panels to show ───────────────────────────
    const showWelcome = activeView === 'dashboard' && !selectedApp;
    const showAppDetail = !!selectedApp;

    // ── Middle search/tab bar shared config ───────────────────────────────────
    const midPanelTitle: Record<SidebarView, string> = {
        dashboard: 'Dashboard', new: 'New Application', all: 'All Applications',
        pending: 'Pending Work', create_form: 'Create Form', profile: 'Profile',
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc' }}>
            <Sidebar
                activeView={activeView}
                canApprove={canApprove}
                pendingCount={pendingApps.length}
                onNavigate={handleSidebarClick}
                onLogout={logout}
            />

            {/* ─── Middle Panel ──────────────────────────────────────────────── */}
            {(activeView === 'new' || activeView === 'all' || activeView === 'pending') && !selectedFormType && (
                <div style={{ width: '280px', minWidth: '280px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                            {midPanelTitle[activeView]}
                        </div>
                        {/* Search */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px' }}>
                            <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: '#374151', width: '100%' }} />
                        </div>
                        {/* Tabs */}
                        {(activeView === 'all' || activeView === 'pending') && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                {(['ongoing', 'completed'] as AppTab[]).map(tab => (
                                    <button key={tab} onClick={() => setAppTab(tab)} style={{ flex: 1, padding: '7px 14px', border: 'none', background: appTab === tab ? '#2563eb' : '#f3f4f6', color: appTab === tab ? '#fff' : '#6b7280', fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" style={{ color: '#9ca3af' }} /></div>}
                        {!loading && activeView === 'new' && (
                            <NewApplicationView
                                formTypes={formTypes} searchQuery={searchQuery}
                                selectedFormType={null} formData={formData} submitting={false}
                                submitSuccess={false} isAdmin={isAdmin} profile={profile}
                                sigUploading={sigUploading} availableDepartments={availableDepartments}
                                availableRoles={availableRoles} liveRoles={liveRoles}
                                onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                                onSubmit={() => { }} onCancel={() => { }}
                                onEditFormType={handleEditFormType} onCreateFormType={() => handleSidebarClick('create_form')}
                                onSigUpload={handleSigUpload}
                            />
                        )}
                        {!loading && activeView === 'all' && (
                            <AllApplicationsView
                                applications={applications} selectedApp={selectedApp}
                                appTab={appTab} searchQuery={searchQuery} isAdmin={isAdmin}
                                userId={user?.id} onSelect={setSelectedApp}
                            />
                        )}
                        {!loading && activeView === 'pending' && (
                            <PendingWorkView
                                pendingApps={pendingApps} processedApps={processedApps}
                                selectedApp={selectedApp} appTab={appTab} searchQuery={searchQuery}
                                onSelect={setSelectedApp}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ─── Right / Main Panel ────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                {/* Welcome */}
                {showWelcome && (
                    <WelcomeScreen user={user} stats={{ total: myApps.length, ongoing: ongoingApps.length, completed: completedApps.length }} />
                )}

                {/* New application — form fill */}
                {activeView === 'new' && selectedFormType && (
                    <NewApplicationView
                        formTypes={formTypes} searchQuery={searchQuery}
                        selectedFormType={selectedFormType} formData={formData}
                        submitting={submitting} submitSuccess={submitSuccess}
                        isAdmin={isAdmin} profile={profile} sigUploading={sigUploading}
                        availableDepartments={availableDepartments} availableRoles={availableRoles}
                        liveRoles={liveRoles}
                        onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                        onSubmit={handleFormSubmit} onCancel={() => { setSelectedFormType(null); setFormData({}); }}
                        onEditFormType={handleEditFormType} onCreateFormType={() => handleSidebarClick('create_form')}
                        onSigUpload={handleSigUpload}
                    />
                )}

                {/* Application detail */}
                {showAppDetail && (
                    <ApplicationDetail
                        app={selectedApp!} canApprove={canApprove}
                        isInPendingView={activeView === 'pending'}
                        profile={profile} sigUploading={sigUploading}
                        remarks={remarks} approvalData={approvalData} actionLoading={actionLoading}
                        onRemarks={setRemarks} onApprovalData={setApprovalData}
                        onDecision={handleDecision} onDownloadPdf={handleDownloadPdf}
                        onSigUpload={handleSigUpload}
                    />
                )}

                {/* Create / Edit form */}
                {activeView === 'create_form' && (
                    <CreateFormView
                        isEdit={!!editingFormId} newFormName={newFormName} newFormDesc={newFormDesc}
                        builderSteps={builderSteps} availableRoles={availableRoles}
                        creating={creating} createSuccess={createSuccess}
                        onNameChange={setNewFormName} onDescChange={setNewFormDesc}
                        onStepsChange={setBuilderSteps} onSave={handleSaveFormType}
                        onCancel={() => {
                            handleSidebarClick('dashboard');
                            setNewFormName(''); setNewFormDesc('');
                            setBuilderSteps([{ status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }]);
                        }}
                    />
                )}

                {/* Profile */}
                {activeView === 'profile' && (
                    <ProfileView user={user} profile={profile} sigUploading={sigUploading} onSigUpload={handleSigUpload} />
                )}
            </main>
        </div>
    );
}
