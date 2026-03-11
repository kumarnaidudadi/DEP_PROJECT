'use client';
// ─── /dashboard/create ──────────────────────────────────────────────────────────
// Create / Edit Form Type (admin only)

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useForms } from '@/hooks/useForms';
import { BuilderStep } from '@/types';
import CreateFormView from '@/components/dashboard/views/CreateFormView';
import * as formTypeSvc from '@/services/formTypeService';

const EMPTY_STEP: BuilderStep = { status: 'Draft', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] };

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
    }, [editId, formTypes]);

    const handleSave = async () => {
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
            if (editId) { await formTypeSvc.updateFormType(Number(editId), payload); }
            else { await formTypeSvc.createFormType(payload); }
            setCreateSuccess(true);
            setNewFormName(''); setNewFormDesc('');
            setBuilderSteps([{ ...EMPTY_STEP }]);
            setTimeout(() => { setCreateSuccess(false); router.push('/dashboard/new'); }, 2000);
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to save the form type');
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
                onCancel={() => router.push('/dashboard')}
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
