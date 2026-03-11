'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import WelcomeScreen from '@/components/dashboard/WelcomeScreen';

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function Dashboard() {
    const { user, userRoles, logout } = useAuth();
    const {
        formTypes, setFormTypes, applications, setApplications, loading,
        fetchFormTypes, fetchApplications, submitForm, makeDecision, triggerDownloadPdf, deleteApplication
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
    const [activeAdminTab, setActiveAdminTab] = useState<'active' | 'inactive'>('active');

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
        fetchApplications();
    }, [fetchApplications]);

    // Admin sees all applications in stats; regular users see only theirs
    const storedRoles = userRoles.map(r => (typeof r === 'string' ? r.toUpperCase() : ''));
    const isAdmin = storedRoles.includes('ADMIN');
    const userId = user?.id ? Number(user.id) : null;

    const baseApps = isAdmin
        ? applications
        : (userId !== null ? applications.filter(a => Number(a.submitted_by) === userId) : []);

    const ongoingApps = baseApps.filter(a => !isTerminal(a.current_status));
    const completedApps = baseApps.filter(a => isTerminal(a.current_status));

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', fontFamily: 'Inter, -apple-system, sans-serif', background: '#f8fafc' }}>
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
                                onEditFormType={handleEditFormType} onToggleActive={handleToggleFormType}
                                adminTab={activeAdminTab}
                                onAdminTabChange={setActiveAdminTab}
                                onCreateFormType={() => handleSidebarClick('create_form')}
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
                        onEditFormType={handleEditFormType}
                        onToggleActive={handleToggleFormType}
                        adminTab={activeAdminTab}
                        onAdminTabChange={setActiveAdminTab}
                        onCreateFormType={() => handleSidebarClick('create_form')}
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
                        isAdmin={isAdmin}
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
