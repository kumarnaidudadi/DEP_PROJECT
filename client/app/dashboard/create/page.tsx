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

function serializeBuilderState(
    newFormName: string,
    newFormDesc: string,
    formFields: BuilderField[],
    approvalRoles: string[],
) {
    return JSON.stringify({
        name: newFormName.trim(),
        description: newFormDesc.trim(),
        approvalRoles: [...approvalRoles].sort(),
        fields: formFields.map(field => ({
            id: field.id,
            name: field.name,
            type: field.type,
            required: field.required,
            options: field.options || [],
            min: field.min ?? null,
            max: field.max ?? null,
            helpText: field.helpText || '',
            conditionalLogic: field.conditionalLogic || null,
            subFields: field.subFields || [],
        })),
    });
}

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
    const [initialSnapshot, setInitialSnapshot] = useState(() =>
        serializeBuilderState('', '', [createBuilderField()], [])
    );

    const currentSnapshot = serializeBuilderState(newFormName, newFormDesc, formFields, approvalRoles);
    const isDirty = currentSnapshot !== initialSnapshot;
    const allowNavigationRef = React.useRef(false);
    const popGuardActiveRef = React.useRef(false);
    const isDirtyRef = React.useRef(isDirty);
    const attemptLeaveRef = React.useRef<() => Promise<boolean>>(async () => true);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    useEffect(() => {
        fetchRoles();
        if (editId) fetchFormTypes();
    }, [fetchRoles, fetchFormTypes, editId]);

    useEffect(() => {
        if (editId) return;
        setInitialSnapshot(serializeBuilderState('', '', [createBuilderField()], []));
    }, [editId]);

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
        const nextApprovalRoles = rolesFromSchema.length ? rolesFromSchema : rolesFromRules;
        setApprovalRoles(nextApprovalRoles);
        setInitialSnapshot(serializeBuilderState(ft.name, ft.description || '', loadedFields.length ? loadedFields : [createBuilderField()], nextApprovalRoles));
    }, [editId, formTypes]);

    const handleSave = React.useCallback(async ({ redirectAfterSave = true }: { redirectAfterSave?: boolean } = {}) => {
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
            
            const resetFields = [createBuilderField()];
            const resetRoles: string[] = [];
            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setFormFields(resetFields);
            setApprovalRoles(resetRoles);
            setInitialSnapshot(serializeBuilderState('', '', resetFields, resetRoles));
            if (redirectAfterSave) {
                setTimeout(() => { setCreateSuccess(false); router.push('/dashboard/new'); }, 2000);
            }
            return true;
        } catch (error: unknown) {
            const message = typeof error === 'object' && error !== null && 'response' in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
                : null;
            alert(message || 'Failed to save the form type');
            return false;
        } finally { setCreating(false); }
    }, [approvalRoles, editId, formFields, newFormDesc, newFormName, router]);

    const handleAttemptLeave = React.useCallback(async () => {
        if (!isDirty || allowNavigationRef.current) return true;

        const wantsSave = window.confirm('You have unsaved changes. Do you want to save this form before leaving?');
        if (wantsSave) {
            const saved = await handleSave({ redirectAfterSave: false });
            if (saved) allowNavigationRef.current = true;
            return Boolean(saved);
        }

        const discard = window.confirm('Discard your unsaved changes and leave this page?');
        if (discard) {
            allowNavigationRef.current = true;
            return true;
        }

        return false;
    }, [handleSave, isDirty]);

    useEffect(() => {
        attemptLeaveRef.current = handleAttemptLeave;
    }, [handleAttemptLeave]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty || allowNavigationRef.current) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        if (popGuardActiveRef.current) return;

        window.history.pushState({ createFormGuard: true }, '', window.location.href);
        popGuardActiveRef.current = true;

        const handlePopState = async () => {
            if (allowNavigationRef.current || !isDirtyRef.current) {
                allowNavigationRef.current = false;
                return;
            }

            window.history.pushState({ createFormGuard: true }, '', window.location.href);
            const canLeave = await attemptLeaveRef.current();
            if (!canLeave) return;

            setTimeout(() => {
                window.history.back();
            }, 0);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            popGuardActiveRef.current = false;
        };
    }, []);

    const handleCancel = React.useCallback(async () => {
        const canLeave = await handleAttemptLeave();
        if (!canLeave) return;
        router.back();
    }, [handleAttemptLeave, router]);

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
                onCancel={handleCancel}
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
