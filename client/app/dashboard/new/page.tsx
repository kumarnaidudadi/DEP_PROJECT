'use client';
// ─── /dashboard/new ─────────────────────────────────────────────────────────────
// New Application: form-type list (middle panel) + form fill (right panel)

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { FormType, getSchemaFields } from '@/types';
import NewApplicationView from '@/components/dashboard/views/NewApplicationView';
import * as formTypeSvc from '@/services/formTypeService';
import * as formSvc from '@/services/formService';
import { Toast, ToastType } from '@/components/ui/Toast';

function NewApplicationContent() {
    const { user } = useAuth();
    const { formTypes, setFormTypes, loading, fetchFormTypes, submitForm, saveDraft } = useForms();
    const { profile, availableRoles, availableDepartments, sigUploading, fetchProfile, fetchRoles, fetchDepartments, handleSigUpload } = useProfile();
    const searchParams = useSearchParams();
    const draftIdFromUrl = searchParams.get('draftId');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

    // Load draft if draftId is present in URL
    useEffect(() => {
        if (draftIdFromUrl && !currentDraftId) {
            const id = Number(draftIdFromUrl);
            formSvc.getFormById(id).then(form => {
                if (form && form.current_status === 'DRAFT' && form.form_types) {
                    setSelectedFormType(form.form_types as FormType);
                    setFormData((form.form_data as any) || {});
                    setCurrentDraftId(id);
                }
            }).catch((e: any) => console.error('Failed to load draft', e));
        }
    }, [draftIdFromUrl, currentDraftId]);

    useEffect(() => {
        fetchFormTypes();
        fetchRoles();
        fetchDepartments();
        fetchProfile();
    }, [fetchFormTypes, fetchRoles, fetchDepartments, fetchProfile]);

    const storedRoles = (user as any)?.roles?.map((r: string) => r.toUpperCase()) || [];
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const allRoles = [...new Set([...liveRoles, ...storedRoles])];
    const isAdmin = allRoles.includes('ADMIN');

    const handleSubmit = async () => {
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
            await submitForm(selectedFormType.id, formData, currentDraftId || undefined);
            setSubmitSuccess(true);
            setFormData({});
            setCurrentDraftId(null);
            setTimeout(() => {
                setSubmitSuccess(false);
                setSelectedFormType(null);
            }, 1500);
        } catch { alert('Failed to submit'); }
        finally { setSubmitting(false); }
    };

    const handleSaveDraft = async () => {
        if (!selectedFormType) return;
        setIsDrafting(true);
        try {
            const res = await saveDraft(selectedFormType.id, formData, currentDraftId || undefined);
            setCurrentDraftId(res.id);
            setToast({ message: 'Draft saved successfully', type: 'success' });
        } catch (e) {
            console.error('Failed to save draft', e);
            setToast({ message: 'Failed to save draft', type: 'error' });
        } finally {
            setIsDrafting(false);
        }
    };

    const handleEditFormType = (ft: FormType) => {
        window.location.href = `/dashboard/create?editId=${ft.id}`;
    };

    const handleToggleFormType = async (ft: FormType) => {
        const isDeactivating = ft.is_active !== false;
        
        if (isDeactivating) {
            if (!window.confirm(`Are you sure you want to deactivate the "${ft.name}" form? It will be hidden from users.`)) {
                return;
            }
        }

        const newActive = !isDeactivating;

        // Optimistic UI Update: Instantly flip the toggle and move the form in lists
        setFormTypes(prev => prev.map(f => f.id === ft.id ? { ...f, is_active: newActive } : f));
        if (selectedFormType?.id === ft.id) {
            setSelectedFormType(prev => prev ? { ...prev, is_active: newActive } : prev);
        }

        try {
            await formTypeSvc.updateFormType(ft.id, {
                name: ft.name,
                description: ft.description,
                schema_definition: ft.schema_definition,
                workflow_steps: [], 
                is_active: newActive
            });
            
            setToast({ message: `Form type "${ft.name}" ${newActive ? 'activated' : 'deactivated'} successfully.`, type: 'success' });
        } catch (e: any) {
            // Rollback optimistic update on failure
            setFormTypes(prev => prev.map(f => f.id === ft.id ? { ...f, is_active: !newActive } : f));
            if (selectedFormType?.id === ft.id) {
                setSelectedFormType(prev => prev ? { ...prev, is_active: !newActive } : prev);
            }
            setToast({ message: e.response?.data?.error || 'Failed to update the form status.', type: 'error' });
        }
    };

    return (
        <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
            {/* Middle Panel — form list */}
            <div style={{ width: '280px', minWidth: '280px', background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>New Application</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '7px 12px' }}>
                        <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: '#374151', width: '100%' }} />
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                    {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={22} className="animate-spin" style={{ color: '#9ca3af' }} /></div>}
                    {!loading && (
                        <NewApplicationView
                            formTypes={formTypes} searchQuery={searchQuery}
                            selectedFormType={null} activeFormTypeId={selectedFormType?.id ?? null}
                            formData={formData} submitting={false} submitSuccess={false}
                            isAdmin={isAdmin} profile={profile} sigUploading={sigUploading}
                            availableDepartments={availableDepartments} availableRoles={availableRoles}
                            liveRoles={liveRoles}
                            adminTab={activeTab}
                            onAdminTabChange={setActiveTab}
                            onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                            onSubmit={() => {}} onCancel={() => {}}
                            onEditFormType={handleEditFormType}
                            onToggleActive={handleToggleFormType}
                            onCreateFormType={() => { window.location.href = '/dashboard/create'; }}
                            onSigUpload={handleSigUpload}
                        />
                    )}
                </div>
            </div>

            {/* Right Panel — form fill or placeholder */}
            <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                {!selectedFormType && (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '13px' }}>
                        Select a form from the list to get started
                    </div>
                )}
                {selectedFormType && (
                    <NewApplicationView
                        formTypes={formTypes} searchQuery={searchQuery}
                        selectedFormType={selectedFormType} formData={formData}
                        submitting={submitting} isSavingDraft={isDrafting} submitSuccess={submitSuccess}
                        isAdmin={isAdmin} profile={profile} sigUploading={sigUploading}
                        availableDepartments={availableDepartments} availableRoles={availableRoles}
                        liveRoles={liveRoles}
                        adminTab={activeTab}
                        onAdminTabChange={setActiveTab}
                        onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                        onSubmit={handleSubmit} onSaveDraft={handleSaveDraft}
                        onCancel={() => { setSelectedFormType(null); setFormData({}); setCurrentDraftId(null); }}
                        onEditFormType={handleEditFormType}
                        onToggleActive={handleToggleFormType}
                        onCreateFormType={() => { window.location.href = '/dashboard/create'; }}
                        onSigUpload={handleSigUpload}
                    />
                )}
            </main>

            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </div>
    );
}

export default function NewApplicationPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={30} className="animate-spin" /></div>}>
            <NewApplicationContent />
        </Suspense>
    );
}
