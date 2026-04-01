'use client';
// ─── /dashboard/new/[id] ─────────────────────────────────────────────────────────────
// New Application: form fill (right panel equivalent)

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { FormType, getSchemaFields } from '@/types';
import NewApplicationView from '@/components/dashboard/views/NewApplicationView';
import * as formTypeSvc from '@/services/formTypeService';
import * as formSvc from '@/services/formService';
import { Toast, ToastType } from '@/components/ui/Toast';

function NewApplicationFormContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const formId = Number(params.id);
    const draftIdFromUrl = searchParams.get('draftId');

    const { user } = useAuth();
    const { formTypes, setFormTypes, loading, fetchFormTypes, submitForm, saveDraft } = useForms();
    const { profile, availableRoles, availableDepartments, sigUploading, fetchProfile, fetchRoles, fetchDepartments, handleSigUpload } = useProfile();

    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [isDrafting, setIsDrafting] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState<number | null>(draftIdFromUrl ? Number(draftIdFromUrl) : null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);

    useEffect(() => {
        fetchFormTypes();
        fetchRoles();
        fetchDepartments();
        fetchProfile();
    }, [fetchFormTypes, fetchRoles, fetchDepartments, fetchProfile]);

    // Set selected form type when formTypes changes
    useEffect(() => {
        if (formTypes && formTypes.length > 0) {
            const ft = formTypes.find(f => f.id === formId);
            if (ft && !selectedFormType) {
                setSelectedFormType(ft);
            }
        }
    }, [formTypes, formId, selectedFormType]);

    // Load draft if we have an explicit draftId either from URL or state
    useEffect(() => {
        if (currentDraftId && selectedFormType) {
            formSvc.getFormById(currentDraftId).then(form => {
                if (form && form.current_status === 'DRAFT' && form.form_data) {
                    setFormData(form.form_data as any);
                }
            }).catch((e: any) => console.error('Failed to load draft', e));
        }
    }, [currentDraftId, selectedFormType]);

    const storedRoles = (user as any)?.roles?.map((r: string) => r.toUpperCase()) || [];
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const allRoles = [...new Set([...liveRoles, ...storedRoles])];
    const isAdmin = allRoles.includes('ADMIN');

    const handleSubmit = async (toUserId: number, note: string) => {
        if (!selectedFormType) return;
        const schemaFields = getSchemaFields((selectedFormType as any).schema_definition ?? (selectedFormType as any).schema ?? {});
        const missing = schemaFields.filter(f => {
            if (!f.required) return false;
            if (f.type === 'date_from_to') return !formData[`${f.key}_from`] || !formData[`${f.key}_to`];
            return !formData[f.key];
        }).map(f => f.label);
        if (missing.length > 0) { alert(`Please fill in:\n- ${missing.join('\n- ')}`); return; }

        setSubmitting(true);
        try {
            await submitForm(selectedFormType.id, formData, currentDraftId || undefined, toUserId, note);
            setSubmitSuccess(true);
            setFormData({});
            setCurrentDraftId(null);
            setTimeout(() => {
                router.push('/dashboard/all?tab=ongoing');
            }, 1500);
        } catch { alert('Failed to submit'); }
        finally { setSubmitting(false); }
    };

    const { searchUsers } = useForms();

    const handleSaveDraft = async () => {
        if (!selectedFormType) return;
        setIsDrafting(true);
        try {
            const res = await saveDraft(selectedFormType.id, formData, currentDraftId || undefined);
            setCurrentDraftId(res.id);
            setToast({ message: 'Draft saved successfully', type: 'success' });
            if (!draftIdFromUrl) {
                router.replace(`/dashboard/new/${formId}?draftId=${res.id}`);
            }
        } catch (e) {
            console.error('Failed to save draft', e);
            setToast({ message: 'Failed to save draft', type: 'error' });
        } finally {
            setIsDrafting(false);
        }
    };

    const handleEditFormType = (ft: FormType) => {
        router.push(`/dashboard/create?editId=${ft.id}`);
    };

    const handleToggleFormType = async (ft: FormType) => {
        const isDeactivating = ft.is_active !== false;
        
        if (isDeactivating) {
            if (!window.confirm(`Are you sure you want to deactivate the "${ft.name}" form? It will be hidden from users.`)) {
                return;
            }
        }

        const newActive = !isDeactivating;

        setFormTypes(prev => prev.map(f => f.id === ft.id ? { ...f, is_active: newActive } : f));
        if (selectedFormType?.id === ft.id) {
            setSelectedFormType(prev => prev ? { ...prev, is_active: newActive } : prev);
        }

        try {
            await formTypeSvc.updateFormType(ft.id, {
                name: ft.name,
                description: ft.description,
                schema: (ft as any).schema || (ft as any).schema_definition || {},
                approval_rules: (ft.approval_rules as any) || { required_roles: [] },
                is_active: newActive
            });
            
            setToast({ message: `Form type "${ft.name}" ${newActive ? 'activated' : 'deactivated'} successfully.`, type: 'success' });
        } catch (e: any) {
            setFormTypes(prev => prev.map(f => f.id === ft.id ? { ...f, is_active: !newActive } : f));
            if (selectedFormType?.id === ft.id) {
                setSelectedFormType(prev => prev ? { ...prev, is_active: !newActive } : prev);
            }
            setToast({ message: e.response?.data?.error || 'Failed to update the form status.', type: 'error' });
        }
    };

    const handleCancel = () => {
        router.push('/dashboard/new');
    };

    if (loading || !selectedFormType) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
            {/* Header with back button */}
            <div style={{ padding: '16px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={() => router.push('/dashboard/new')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#4b5563',
                            cursor: 'pointer',
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                        title="Back to Forms"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2, textTransform: 'capitalize' }}>
                            {selectedFormType.name.toLowerCase()}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>
                            {selectedFormType.description || 'Fill in the details below'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel — form fill */}
            <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
                <NewApplicationView
                    formTypes={formTypes} searchQuery=""
                    selectedFormType={selectedFormType} formData={formData}
                    submitting={submitting} isSavingDraft={isDrafting} submitSuccess={submitSuccess}
                    isAdmin={isAdmin} profile={profile} sigUploading={sigUploading}
                    availableDepartments={availableDepartments} availableRoles={availableRoles}
                    liveRoles={liveRoles}
                    onSelectFormType={() => {}} onFormDataChange={setFormData}
                    onSubmit={handleSubmit} onSearchUsers={searchUsers} onSaveDraft={handleSaveDraft}
                    onCancel={handleCancel}
                    onEditFormType={handleEditFormType}
                    onToggleActive={handleToggleFormType}
                    onCreateFormType={() => { router.push('/dashboard/create'); }}
                    onSigUpload={handleSigUpload}
                />
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

export default function NewApplicationDetailPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={30} className="animate-spin" /></div>}>
            <NewApplicationFormContent />
        </Suspense>
    );
}
