'use client';
// ─── /dashboard/create ──────────────────────────────────────────────────────────
// Create / Edit Form Type (admin only)

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useForms } from '@/hooks/useForms';
import { BuilderField, BuilderStep, createBuilderField, createBuilderFieldId } from '@/types';
import CreateFormView from '@/components/dashboard/views/CreateFormView';
import * as formTypeSvc from '@/services/formTypeService';

const EMPTY_STEP: BuilderStep = { status: 'Draft', approval_roles: [], fields: [createBuilderField()] };

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
    const [builderSteps, setBuilderSteps] = useState<BuilderStep[]>([{ ...EMPTY_STEP }]);
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
        if (ft.schema_definition) {
            // Parse schema into builder steps (schema keys are step numbers)
            const schemaKeys = Object.keys(ft.schema_definition).sort((a, b) => Number(a) - Number(b));
            const stepsMap = schemaKeys.map((key) => {
                const stepSchemaArr = ft.schema_definition[key] as PersistedBuilderField[] | undefined;
                const statusObj = Array.isArray(stepSchemaArr) && stepSchemaArr[0] && 'status' in (stepSchemaArr[0] as any)
                    ? (stepSchemaArr[0] as any)
                    : null;
                const fieldsArr = Array.isArray(stepSchemaArr)
                    ? stepSchemaArr.filter((item): item is PersistedBuilderField & { name: string } => typeof item?.name === 'string' && item.name.trim().length > 0)
                    : [];
                const fields = fieldsArr.length > 0
                    ? fieldsArr.map(item => ({
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
                    }))
                    : [createBuilderField()];
                // Extract approval roles from approval_rules if available
                const approvalRules = (ft.approval_rules as any) || {};
                const requiredRoles: string[] = approvalRules.required_roles || [];
                return {
                    status: statusObj?.status || `Step ${key}`,
                    approval_roles: requiredRoles,
                    fields
                };
            });
            if (stepsMap.length > 0) setBuilderSteps(stepsMap);
        }
    }, [editId, formTypes]);

    const handleSave = async () => {
        if (!newFormName.trim()) { alert('Form name is required'); return; }
        setCreating(true); setCreateSuccess(false);
        try {
            const schema: Record<string, Array<Record<string, unknown>>> = {};
            builderSteps.forEach((s, i) => {
                schema[String(i + 1)] = [
                    { status: s.status },
                    ...s.fields.filter(f => f.name.trim()).map(f => ({
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
                    })),
                ];
            });
            // Collect unique approval roles from all steps
                const allRoles = new Set<string>();
                builderSteps.forEach(s => s.approval_roles.forEach(r => allRoles.add(r)));

                const payload = {
                name: newFormName.trim(),
                description: newFormDesc.trim(),
                schema_definition: schema,
                approval_rules: { required_roles: Array.from(allRoles) },
            };
            if (editId) { await formTypeSvc.updateFormType(Number(editId), payload); }
            else { await formTypeSvc.createFormType(payload); }
            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setBuilderSteps([{ ...EMPTY_STEP }]);
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
                builderSteps={builderSteps} availableRoles={availableRoles}
                creating={creating} createSuccess={createSuccess}
                onNameChange={setNewFormName} onDescChange={setNewFormDesc}
                onStepsChange={setBuilderSteps} onSave={handleSave}
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
