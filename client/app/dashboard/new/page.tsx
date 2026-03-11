'use client';
// ─── /dashboard/new ─────────────────────────────────────────────────────────────
// New Application: form-type list (middle panel) + form fill (right panel)

import React, { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { FormType, getSchemaFields } from '@/types';
import NewApplicationView from '@/components/dashboard/views/NewApplicationView';

export default function NewApplicationPage() {
    const { user } = useAuth();
    const { formTypes, loading, fetchFormTypes, submitForm } = useForms();
    const { profile, availableRoles, availableDepartments, sigUploading, fetchProfile, fetchRoles, fetchDepartments, handleSigUpload } = useProfile();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

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
            await submitForm(selectedFormType.id, formData);
            setSubmitSuccess(true);
            setFormData({});
            setTimeout(() => {
                setSubmitSuccess(false);
                setSelectedFormType(null);
            }, 1500);
        } catch { alert('Failed to submit'); }
        finally { setSubmitting(false); }
    };

    const handleEditFormType = (ft: FormType) => {
        window.location.href = `/dashboard/create?editId=${ft.id}`;
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
                            onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                            onSubmit={() => {}} onCancel={() => {}}
                            onEditFormType={handleEditFormType}
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
                        submitting={submitting} submitSuccess={submitSuccess}
                        isAdmin={isAdmin} profile={profile} sigUploading={sigUploading}
                        availableDepartments={availableDepartments} availableRoles={availableRoles}
                        liveRoles={liveRoles}
                        onSelectFormType={setSelectedFormType} onFormDataChange={setFormData}
                        onSubmit={handleSubmit}
                        onCancel={() => { setSelectedFormType(null); setFormData({}); }}
                        onEditFormType={handleEditFormType}
                        onCreateFormType={() => { window.location.href = '/dashboard/create'; }}
                        onSigUpload={handleSigUpload}
                    />
                )}
            </main>
        </div>
    );
}
