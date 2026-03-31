'use client';
// ─── /dashboard/create ──────────────────────────────────────────────────────────
// Create / Edit Form Type (admin only)

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useForms } from '@/hooks/useForms';
import { BuilderField, createBuilderField, createBuilderFieldId } from '@/types';
import CreateFormView from '@/components/dashboard/views/CreateFormView';
import * as formTypeSvc from '@/services/formTypeService';

type PersistedBuilderField = {
    id?: string;
    name?: string;
    type?: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    helpText?: string;
    conditionalLogic?: BuilderField['conditionalLogic'];
    subFields?: BuilderField['subFields'];
};

function CreateFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('editId');

    const { availableRoles, fetchRoles } = useProfile();
    const { formTypes, fetchFormTypes } = useForms();

    const [newFormName, setNewFormName] = useState('');
    const [newFormDesc, setNewFormDesc] = useState('');
    const [formFields, setFormFields] = useState<BuilderField[]>([createBuilderField()]);
    const [approvalRoles, setApprovalRoles] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);

    useEffect(() => {
        fetchRoles();
        if (editId) fetchFormTypes();
    }, [fetchRoles, fetchFormTypes, editId]);

    // Pre-fill when editing
    useEffect(() => {
        if (!editId || formTypes.length === 0) return;
        const ft = formTypes.find(f => f.id === Number(editId));
        if (!ft) return;
        setNewFormName(ft.name);
        setNewFormDesc(ft.description || '');
        
        let loadedFields: BuilderField[] = [createBuilderField()];

        // The backend returns it as ft.schema
        const rawSchema = (ft as any).schema || (ft as any).schema_definition || {};
        const fieldsData = rawSchema.data || rawSchema.fields;

        if (Array.isArray(fieldsData)) {
            loadedFields = fieldsData.map((item: any) => ({
                id: item.id || createBuilderFieldId(),
                name: item.name || '',
                type: item.type || 'text',
                required: item.required === true,
                options: item.options,
                min: item.min,
                max: item.max,
                helpText: item.helpText,
                conditionalLogic: item.conditionalLogic || null,
                subFields: item.subFields,
            }));
        } else if (typeof rawSchema === 'object' && !rawSchema.data) {
            // Legacy fallback if it was {"1": [...]}
            const allFields: any[] = [];
            Object.entries(rawSchema).forEach(([k, arr]: [string, any]) => {
                if (Array.isArray(arr) && k !== 'approval_roles') {
                    allFields.push(...arr.filter(a => typeof a.name === 'string' && a.name.trim().length > 0));
                }
            });
            if (allFields.length > 0) {
                loadedFields = allFields.map(item => ({
                    id: item.id || createBuilderFieldId(),
                    name: item.name,
                    type: item.type || 'text',
                    required: item.required === true,
                    options: item.options,
                    min: item.min,
                    max: item.max,
                    helpText: item.helpText,
                    conditionalLogic: item.conditionalLogic || null,
                    subFields: item.subFields,
                }));
            }
        }

        setFormFields(loadedFields.length ? loadedFields : [createBuilderField()]);

        const rolesFromSchema = rawSchema.approval_roles || [];
        const rolesFromRules = (ft.approval_rules as any)?.required_roles || [];
        setApprovalRoles(rolesFromSchema.length ? rolesFromSchema : rolesFromRules);
    }, [editId, formTypes]);

    const handleSave = async () => {
        if (!newFormName.trim()) { alert('Form name is required'); return; }
        setCreating(true); setCreateSuccess(false);
        try {
            const mappedFields = formFields.filter(f => f.name.trim()).map(f => ({
                id: f.id,
                name: f.name.trim(),
                type: f.type,
                required: f.required,
                ...(f.options?.length ? { options: f.options.filter(Boolean) } : {}),
                ...(f.min !== undefined ? { min: f.min } : {}),
                ...(f.max !== undefined ? { max: f.max } : {}),
                ...(f.helpText?.trim() ? { helpText: f.helpText.trim() } : {}),
                ...(f.conditionalLogic?.dependsOn ? { conditionalLogic: f.conditionalLogic } : {}),
                ...(f.subFields?.length ? { subFields: f.subFields } : {}),
            }));

            const payload = {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema: { 
                    data: mappedFields,
                    approval_roles: approvalRoles 
                },
                approval_rules: { required_roles: approvalRoles }, // Keeping this for backward compatibility in backend logic
            };
            
            if (editId) { await formTypeSvc.updateFormType(Number(editId), payload); }
            else { await formTypeSvc.createFormType(payload); }
            
            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setFormFields([createBuilderField()]);
            setApprovalRoles([]);
            setTimeout(() => { setCreateSuccess(false); router.push('/dashboard/new'); }, 2000);
        } catch (error: unknown) {
            const message = typeof error === 'object' && error !== null && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
                : null;
            alert(message || 'Failed to save the form type');
        } finally { setCreating(false); }
    };

    return (
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
            <CreateFormView
                isEdit={!!editId}
                newFormName={newFormName} newFormDesc={newFormDesc}
                formFields={formFields}
                approvalRoles={approvalRoles} 
                availableRoles={availableRoles}
                creating={creating} createSuccess={createSuccess}
                onNameChange={setNewFormName} onDescChange={setNewFormDesc}
                onFieldsChange={setFormFields}
                onApprovalRolesChange={setApprovalRoles}
                onSave={handleSave}
                onCancel={() => router.back()}
            />
        </main>
    );
}

export default function CreateFormPage() {
    return (
        <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <CreateFormInner />
        </Suspense>
    );
}
