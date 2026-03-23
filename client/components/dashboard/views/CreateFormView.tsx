'use client';

import React from 'react';
import {
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Copy,
    Eye,
    EyeOff,
    GripVertical,
    Loader2,
    Plus,
    Trash2,
} from 'lucide-react';
import FormBuilderPreview from '@/components/ui/FormBuilderPreview';
import FieldTypePicker from '@/components/ui/FieldTypePicker';
import {
    BuilderField,
    BuilderStep,
    createBuilderField,
    createBuilderFieldId,
    suggestFieldTypeFromName,
} from '@/types';

/* ─── Shared inline styles ─────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

const inputStyleSm: React.CSSProperties = {
    ...inputStyle, padding: '7px 10px', fontSize: '12px', borderRadius: '6px',
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
    padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const btnPrimary: React.CSSProperties = {
    padding: '9px 20px', border: 'none',
    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
    borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
};

const btnSecondary: React.CSSProperties = {
    padding: '9px 16px', border: '1px solid #d1d5db', background: '#fff',
    borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer',
    fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px',
};

const btnDanger: React.CSSProperties = {
    ...btnSecondary, color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2',
};

const btnSmall: React.CSSProperties = {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
    padding: '4px 8px', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280',
    fontWeight: 500,
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function cloneField(field: BuilderField): BuilderField {
    return {
        ...field,
        id: createBuilderFieldId(),
        options: field.options ? [...field.options] : undefined,
        conditionalLogic: field.conditionalLogic ? { ...field.conditionalLogic } : null,
        subFields: field.subFields?.map(sf => ({ ...sf, options: sf.options ? [...sf.options] : undefined })),
    };
}

/* ─── Props ────────────────────────────────────────────────────────────────── */

interface Props {
    isEdit: boolean;
    newFormName: string;
    newFormDesc: string;
    builderSteps: BuilderStep[];
    availableRoles: string[];
    creating: boolean;
    createSuccess: boolean;
    onNameChange: (v: string) => void;
    onDescChange: (v: string) => void;
    onStepsChange: (steps: BuilderStep[]) => void;
    onSave: () => void;
    onCancel: () => void;
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function CreateFormView({
    isEdit, newFormName, newFormDesc, builderSteps, availableRoles,
    creating, createSuccess, onNameChange, onDescChange, onStepsChange,
    onSave, onCancel,
}: Props) {
    const [draggedIdx, setDraggedIdx] = React.useState<{ step: number; field: number } | null>(null);
    const [dragOverIdx, setDragOverIdx] = React.useState<{ step: number; field: number } | null>(null);
    const [draggableIdx, setDraggableIdx] = React.useState<{ step: number; field: number } | null>(null);
    const [recentFieldTypes, setRecentFieldTypes] = React.useState<string[]>([]);
    const [previewEnabled, setPreviewEnabled] = React.useState(true);
    const [previewData, setPreviewData] = React.useState<Record<string, unknown>>({});
    const [expandedCondIdx, setExpandedCondIdx] = React.useState<string | null>(null);

    // Recent field types persistence
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        try { const s = window.localStorage.getItem('dep_builder_recent_field_types'); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setRecentFieldTypes(p); } } catch { /* ignore */ }
    }, []);
    React.useEffect(() => {
        if (typeof window !== 'undefined') window.localStorage.setItem('dep_builder_recent_field_types', JSON.stringify(recentFieldTypes.slice(0, 6)));
    }, [recentFieldTypes]);

    const touchRecent = React.useCallback((type: string) => {
        setRecentFieldTypes(c => [type, ...c.filter(t => t !== type)].slice(0, 6));
    }, []);

    /* ── Immutable updaters ──────────────────────────────────────────────── */

    const updateStep = React.useCallback((si: number, fn: (s: BuilderStep) => BuilderStep) => {
        onStepsChange(builderSteps.map((s, i) => i === si ? fn(s) : s));
    }, [builderSteps, onStepsChange]);

    const updateField = React.useCallback((si: number, fi: number, fn: (f: BuilderField) => BuilderField) => {
        onStepsChange(builderSteps.map((s, i) => i !== si ? s : { ...s, fields: s.fields.map((f, j) => j === fi ? fn(f) : f) }));
    }, [builderSteps, onStepsChange]);

    const applyFieldType = React.useCallback((si: number, fi: number, nextType: string) => {
        updateField(si, fi, field => {
            const f: BuilderField = { ...field, type: nextType, required: nextType === 'heading' ? false : field.required };
            if (nextType === 'select' && (!f.options || f.options.length === 0)) f.options = ['Option 1', 'Option 2'];
            if (nextType !== 'select' && nextType !== 'paragraph_blanks') f.options = undefined;
            if (nextType === 'paragraph_blanks' && (!f.options || f.options.length === 0)) f.options = ['I confirm that [____].'];
            if ((nextType === 'tuple' || nextType === 'list') && (!f.subFields || f.subFields.length === 0)) f.subFields = [{ name: '', type: 'text' }];
            if (nextType !== 'tuple' && nextType !== 'list') f.subFields = undefined;
            if (nextType !== 'number') { f.min = undefined; f.max = undefined; }
            return f;
        });
        touchRecent(nextType);
    }, [touchRecent, updateField]);

    /* ── Drag & Drop ─────────────────────────────────────────────────────── */

    const handleDragStart = React.useCallback((si: number, fi: number) => setDraggedIdx({ step: si, field: fi }), []);
    const handleDragOver = React.useCallback((e: React.DragEvent, si: number, fi: number) => { e.preventDefault(); setDragOverIdx({ step: si, field: fi }); }, []);
    const handleDrop = React.useCallback((tsi: number, tfi: number) => {
        if (!draggedIdx) { setDraggedIdx(null); setDragOverIdx(null); return; }
        const next = [...builderSteps];
        const src = [...next[draggedIdx.step].fields];
        const [moved] = src.splice(draggedIdx.field, 1);
        if (!moved) { setDraggedIdx(null); setDragOverIdx(null); return; }
        if (draggedIdx.step === tsi) { src.splice(tfi, 0, moved); next[draggedIdx.step] = { ...next[draggedIdx.step], fields: src }; }
        else { const tgt = [...next[tsi].fields]; tgt.splice(tfi, 0, moved); next[draggedIdx.step] = { ...next[draggedIdx.step], fields: src }; next[tsi] = { ...next[tsi], fields: tgt }; }
        onStepsChange(next); setDraggedIdx(null); setDragOverIdx(null);
    }, [builderSteps, draggedIdx, onStepsChange]);

    const scrollToStep = (i: number) => { const el = document.getElementById(`builder-step-${i}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const totalFields = builderSteps.reduce((n, s) => n + s.fields.length, 0);

    /* ─── Render ──────────────────────────────────────────────────────────── */

    return (
        <div style={{ display: 'flex', gap: '24px', padding: '24px', maxWidth: '1720px', margin: '0 auto' }}>

            {/* ── LEFT SIDEBAR: Workflow Map + Actions ────────────────────────── */}
            <aside style={{ width: '240px', flexShrink: 0, position: 'sticky', top: '24px', alignSelf: 'flex-start' }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                        Workflow Map
                    </div>

                    {/* Stats */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>{builderSteps.length} step{builderSteps.length > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>{totalFields} field{totalFields !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Step list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                        {builderSteps.map((step, i) => (
                            <button key={`${step.status}-${i}`} type="button" onClick={() => scrollToStep(i)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}>
                                <span style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{i + 1}</span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.status || `Step ${i + 1}`}</div>
                                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{step.fields.length} field{step.fields.length !== 1 ? 's' : ''}</div>
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button type="button" onClick={onSave} disabled={creating}
                            style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}>
                            {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                            {creating ? 'Saving...' : isEdit ? 'Update Form' : 'Save Form'}
                        </button>
                        <button type="button" onClick={onCancel} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
            <main style={{ flex: 1, minWidth: 0, maxWidth: '860px' }}>

                {/* Header */}
                <div style={{ ...cardStyle, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                            {isEdit ? 'Edit Form Type' : 'Create New Form Type'}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            Define stages, fields, and approval roles for your workflow.
                        </p>
                    </div>
                    {/* Preview toggle — Eye icon on the right */}
                    <button type="button" onClick={() => setPreviewEnabled(c => !c)}
                        style={{ ...btnSmall, padding: '6px 10px', borderRadius: '8px' }}
                        title={previewEnabled ? 'Hide preview' : 'Show preview'}>
                        {previewEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                </div>

                {createSuccess && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#15803d', marginBottom: '16px' }}>
                        Form {isEdit ? 'updated' : 'created'} successfully.
                    </div>
                )}

                {/* Form Details */}
                <div style={{ ...cardStyle, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Form Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Form Title</label>
                            <input value={newFormName} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Leave Application" style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea value={newFormDesc} onChange={e => onDescChange(e.target.value)} placeholder="Brief description of the form" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                {/* Steps */}
                {builderSteps.map((step, stepIndex) => (
                    <div key={`step-${stepIndex}`} id={`builder-step-${stepIndex}`} style={{ ...cardStyle, marginBottom: '16px' }}>
                        {/* Step header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{stepIndex + 1}</span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Step {stepIndex + 1}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" onClick={() => { const n = [...builderSteps]; n.splice(stepIndex + 1, 0, { status: '', approval_roles: [], fields: [createBuilderField()] }); onStepsChange(n); }}
                                    style={{ ...btnSmall, color: '#2563eb' }}>
                                    <Plus size={12} /> Add Step
                                </button>
                                {builderSteps.length > 1 && (
                                    <button type="button" onClick={() => { if (!window.confirm('Remove this step?')) return; const n = [...builderSteps]; n.splice(stepIndex, 1); onStepsChange(n); }}
                                        style={{ ...btnSmall, color: '#ef4444', borderColor: '#fecaca' }}>
                                        <Trash2 size={12} /> Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status + Roles */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Status Name</label>
                                <input value={step.status} onChange={e => updateStep(stepIndex, s => ({ ...s, status: e.target.value }))} placeholder="HOD Approval" style={inputStyle} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label style={labelStyle}>Approval Roles</label>
                                    <button type="button" onClick={() => updateStep(stepIndex, s => ({ ...s, showAllRoles: !s.showAllRoles }))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#2563eb', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        {step.showAllRoles ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        {step.showAllRoles ? 'Less' : 'All'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', minHeight: '36px', padding: '6px 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                    {availableRoles.map(role => {
                                        const sel = step.approval_roles.includes(role);
                                        const primary = ['HEAD_OF_DEPARTMENT', 'SECTION_INCHARGE', 'AR_DR_ESTT', 'REGISTRAR'].includes(role);
                                        if (!step.showAllRoles && !primary && !sel) return null;
                                        return (
                                            <button key={role} type="button" onClick={() => updateStep(stepIndex, s => ({ ...s, approval_roles: sel ? s.approval_roles.filter(r => r !== role) : [...s.approval_roles, role] }))}
                                                style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: sel ? '#2563eb' : '#fff', color: sel ? '#fff' : '#6b7280', boxShadow: sel ? '0 1px 4px rgba(37,99,235,0.3)' : '0 0 0 1px #e5e7eb' }}>
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Fields */}
                        <div style={{ background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>Fields</span>
                                <button type="button" onClick={() => updateStep(stepIndex, s => ({ ...s, fields: [...s.fields, createBuilderField()] }))}
                                    style={{ ...btnSmall, color: '#2563eb' }}>
                                    <Plus size={12} /> Add Field
                                </button>
                            </div>

                            {step.fields.length === 0 && (
                                <div onDragOver={e => { e.preventDefault(); setDragOverIdx({ step: stepIndex, field: 0 }); }}
                                    onDrop={e => { e.stopPropagation(); handleDrop(stepIndex, 0); }}
                                    style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '8px', background: '#fff' }}>
                                    Drop a field here or click &quot;Add Field&quot;.
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {step.fields.map((field, fi) => {
                                    const isDragging = draggedIdx?.step === stepIndex && draggedIdx?.field === fi;
                                    const isOver = dragOverIdx?.step === stepIndex && dragOverIdx?.field === fi && !isDragging;
                                    const suggestion = suggestFieldTypeFromName(field.name);
                                    const isHeading = field.type === 'heading';
                                    const condKey = `${stepIndex}-${fi}`;
                                    const condExpanded = expandedCondIdx === condKey;

                                    const depOptions = builderSteps.flatMap((cs, csi) =>
                                        cs.fields.filter(c => c.id !== field.id && c.name.trim() && c.type !== 'heading')
                                            .map(c => ({ id: c.id, label: csi === stepIndex ? c.name : `${cs.status || `Step ${csi + 1}`}: ${c.name}` }))
                                    );

                                    return (
                                        <React.Fragment key={field.id}>
                                        <div
                                            draggable={draggableIdx?.step === stepIndex && draggableIdx?.field === fi}
                                            onDragStart={() => handleDragStart(stepIndex, fi)}
                                            onDragOver={e => handleDragOver(e, stepIndex, fi)}
                                            onDrop={e => { e.stopPropagation(); handleDrop(stepIndex, fi); }}
                                            onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); setDraggableIdx(null); }}
                                            style={{
                                                background: isHeading ? '#f1f5f9' : '#fff', borderRadius: '10px', border: `1px solid ${isOver ? '#3b82f6' : '#e5e7eb'}`,
                                                padding: '12px', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s, border-color 0.15s',
                                            }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* Drag handle */}
                                                <button type="button"
                                                    onMouseEnter={() => setDraggableIdx({ step: stepIndex, field: fi })}
                                                    onMouseLeave={() => setDraggableIdx(null)}
                                                    style={{ background: 'none', border: 'none', cursor: 'grab', color: '#d1d5db', padding: '2px', marginTop: '16px', flexShrink: 0 }}
                                                    title="Drag to reorder">
                                                    <GripVertical size={14} />
                                                </button>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    {/* Row 1: Name + Type - side by side like two inputs */}
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '8px' }}>
                                                        <div>
                                                            <label style={labelStyle}>{isHeading ? 'Heading Text' : 'Field Name'}</label>
                                                            <input value={field.name} onChange={e => updateField(stepIndex, fi, f => ({ ...f, name: e.target.value }))}
                                                                placeholder={isHeading ? 'Section title' : 'e.g. Leave Type'} style={inputStyleSm} />
                                                        </div>
                                                        <div>
                                                            <label style={labelStyle}>Field Type</label>
                                                            <FieldTypePicker value={field.type} onChange={t => applyFieldType(stepIndex, fi, t)} fieldName={field.name} recentTypes={recentFieldTypes}
                                                                suggestion={suggestion} onSuggestionClick={suggestion ? () => applyFieldType(stepIndex, fi, suggestion) : undefined} />
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Help Text */}
                                                    <div style={{ marginTop: '6px' }}>
                                                        <label style={labelStyle}>Help Text</label>
                                                        <input value={field.helpText || ''} onChange={e => updateField(stepIndex, fi, f => ({ ...f, helpText: e.target.value }))}
                                                            placeholder="Short instruction for the applicant" style={inputStyleSm} />
                                                    </div>

                                                    {/* Row 3: Action bar — compact horizontal strip */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                                        {!isHeading && (
                                                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '11px', color: field.required ? '#1e40af' : '#9ca3af', fontWeight: 500 }}>
                                                                <input type="checkbox" checked={field.required} onChange={e => updateField(stepIndex, fi, f => ({ ...f, required: e.target.checked }))}
                                                                    style={{ width: '12px', height: '12px', accentColor: '#2563eb' }} />
                                                                Required
                                                            </label>
                                                        )}
                                                        <span style={{ flex: 1 }} />
                                                        <button type="button" onClick={() => {
                                                            if (field.conditionalLogic) { setExpandedCondIdx(condExpanded ? null : condKey); }
                                                            else { updateField(stepIndex, fi, f => ({ ...f, conditionalLogic: { dependsOn: depOptions[0]?.id || '', operator: 'equals', value: '' } })); setExpandedCondIdx(condKey); }
                                                        }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                color: field.conditionalLogic ? '#2563eb' : '#9ca3af' }}>
                                                            {field.conditionalLogic ? (condExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : null}
                                                            {field.conditionalLogic ? 'Condition' : '+ Condition'}
                                                        </button>
                                                        <span style={{ width: '1px', height: '14px', background: '#e5e7eb' }} />
                                                        <button type="button" onClick={() => updateStep(stepIndex, s => { const nf = [...s.fields]; nf.splice(fi + 1, 0, cloneField(field)); return { ...s, fields: nf }; })}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'inline-flex', alignItems: 'center', padding: '2px' }} title="Duplicate">
                                                            <Copy size={13} />
                                                        </button>
                                                        <button type="button" onClick={() => { if (!window.confirm('Remove this field?')) return; updateStep(stepIndex, s => ({ ...s, fields: s.fields.filter((_, j) => j !== fi) })); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center', padding: '2px' }} title="Delete">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Conditional logic expanded */}
                                                    {field.conditionalLogic && condExpanded && (
                                                        <div style={{ marginTop: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Show this field when</span>
                                                                <button type="button" onClick={() => { updateField(stepIndex, fi, f => ({ ...f, conditionalLogic: null })); setExpandedCondIdx(null); }}
                                                                    style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Remove</button>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                                                <select value={field.conditionalLogic.dependsOn}
                                                                    onChange={e => updateField(stepIndex, fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, dependsOn: e.target.value } : null }))}
                                                                    style={inputStyleSm}>
                                                                    <option value="">Select field</option>
                                                                    {depOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                                                </select>
                                                                <select value={field.conditionalLogic.operator}
                                                                    onChange={e => updateField(stepIndex, fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, operator: e.target.value as NonNullable<BuilderField['conditionalLogic']>['operator'] } : null }))}
                                                                    style={inputStyleSm}>
                                                                    <option value="equals">equals</option>
                                                                    <option value="not_equals">not equals</option>
                                                                    <option value="contains">contains</option>
                                                                    <option value="is_empty">is empty</option>
                                                                    <option value="not_empty">is not empty</option>
                                                                </select>
                                                                {!['is_empty', 'not_empty'].includes(field.conditionalLogic.operator) ? (
                                                                    <input value={field.conditionalLogic.value || ''}
                                                                        onChange={e => updateField(stepIndex, fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, value: e.target.value } : null }))}
                                                                        placeholder="Value" style={inputStyleSm} />
                                                                ) : (
                                                                    <div style={{ ...inputStyleSm, background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>—</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Select options */}
                                                    {field.type === 'select' && (
                                                        <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <label style={labelStyle}>Dropdown Options</label>
                                                                <button type="button" onClick={() => updateField(stepIndex, fi, f => ({ ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] }))}
                                                                    style={{ ...btnSmall, color: '#2563eb' }}><Plus size={11} /> Add</button>
                                                            </div>
                                                            {(field.options || []).map((opt, oi) => (
                                                                <div key={`${field.id}-opt-${oi}`} style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                                                                    <input value={opt} onChange={e => updateField(stepIndex, fi, f => { const o = [...(f.options || [])]; o[oi] = e.target.value; return { ...f, options: o }; })}
                                                                        placeholder={`Option ${oi + 1}`} style={{ ...inputStyleSm, flex: 1 }} />
                                                                    <button type="button" onClick={() => updateField(stepIndex, fi, f => { const o = [...(f.options || [])]; o.splice(oi, 1); return { ...f, options: o }; })}
                                                                        style={{ ...btnSmall, color: '#ef4444', borderColor: '#fecaca' }}><Trash2 size={11} /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Number min/max */}
                                                    {field.type === 'number' && (
                                                        <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                            <div>
                                                                <label style={labelStyle}>Min</label>
                                                                <input type="number" value={field.min ?? ''} onChange={e => updateField(stepIndex, fi, f => ({ ...f, min: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                                                    placeholder="0" style={inputStyleSm} />
                                                            </div>
                                                            <div>
                                                                <label style={labelStyle}>Max</label>
                                                                <input type="number" value={field.max ?? ''} onChange={e => updateField(stepIndex, fi, f => ({ ...f, max: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                                                    placeholder="—" style={inputStyleSm} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Tuple / List columns */}
                                                    {(field.type === 'tuple' || field.type === 'list') && (
                                                        <div style={{ marginTop: '10px', padding: '10px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                <label style={{ ...labelStyle, color: '#4338ca' }}>Columns</label>
                                                                <button type="button" onClick={() => updateField(stepIndex, fi, f => ({ ...f, subFields: [...(f.subFields || []), { name: '', type: 'text' }] }))}
                                                                    style={{ ...btnSmall, color: '#4338ca', borderColor: '#a5b4fc' }}><Plus size={11} /> Column</button>
                                                            </div>
                                                            {(field.subFields || []).map((sf, sfi) => (
                                                                <React.Fragment key={`${field.id}-sf-${sfi}`}>
                                                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '5px', alignItems: 'center' }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', minWidth: '16px' }}>{sfi + 1}.</span>
                                                                        <input value={sf.name} onChange={e => updateField(stepIndex, fi, f => { const s = [...(f.subFields || [])]; s[sfi] = { ...s[sfi], name: e.target.value }; return { ...f, subFields: s }; })}
                                                                            placeholder="Column name" style={{ ...inputStyleSm, flex: 2 }} />
                                                                        <select value={sf.type} onChange={e => updateField(stepIndex, fi, f => {
                                                                            const s = [...(f.subFields || [])];
                                                                            s[sfi] = { ...s[sfi], type: e.target.value, options: e.target.value === 'select' ? (s[sfi].options || ['Option 1']) : undefined };
                                                                            return { ...f, subFields: s };
                                                                        })} style={{ ...inputStyleSm, flex: 1 }}>
                                                                            <option value="text">Text</option>
                                                                            <option value="number">Number</option>
                                                                            <option value="date">Date</option>
                                                                            <option value="date_from_to">Date Range</option>
                                                                            <option value="bool">Yes / No</option>
                                                                            <option value="select">Dropdown</option>
                                                                        </select>
                                                                        <div style={{ display: 'flex', gap: '3px' }}>
                                                                            <button type="button" title="Insert after" onClick={() => updateField(stepIndex, fi, f => { const s = [...(f.subFields || [])]; s.splice(sfi + 1, 0, { name: '', type: 'text' }); return { ...f, subFields: s }; })}
                                                                                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><Plus size={14} /></button>
                                                                            <button type="button" title="Remove" onClick={() => updateField(stepIndex, fi, f => ({ ...f, subFields: (f.subFields || []).filter((_, j) => j !== sfi) }))}
                                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
                                                                        </div>
                                                                    </div>
                                                                    {sf.type === 'select' && (
                                                                        <div style={{ marginLeft: '22px', marginBottom: '8px', padding: '8px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', marginBottom: '6px', textTransform: 'uppercase' }}>Column Options</div>
                                                                            {(sf.options || []).map((opt, oi) => (
                                                                                <div key={oi} style={{ display: 'flex', gap: '5px', marginBottom: '4px' }}>
                                                                                    <input value={opt} onChange={e => updateField(stepIndex, fi, f => { const s = [...(f.subFields || [])]; const o = [...(s[sfi].options || [])]; o[oi] = e.target.value; s[sfi] = { ...s[sfi], options: o }; return { ...f, subFields: s }; })}
                                                                                        placeholder={`Option ${oi + 1}`} style={{ ...inputStyleSm, flex: 1, fontSize: '11px' }} />
                                                                                    <button type="button" onClick={() => updateField(stepIndex, fi, f => { const s = [...(f.subFields || [])]; const o = [...(s[sfi].options || [])]; o.splice(oi, 1); s[sfi] = { ...s[sfi], options: o }; return { ...f, subFields: s }; })}
                                                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button>
                                                                                </div>
                                                                            ))}
                                                                            <button type="button" onClick={() => updateField(stepIndex, fi, f => { const s = [...(f.subFields || [])]; s[sfi] = { ...s[sfi], options: [...(s[sfi].options || []), ''] }; return { ...f, subFields: s }; })}
                                                                                style={{ ...btnSmall, color: '#2563eb', marginTop: '2px' }}><Plus size={10} /> Add Option</button>
                                                                        </div>
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Paragraph blanks */}
                                                    {field.type === 'paragraph_blanks' && (
                                                        <div style={{ marginTop: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <label style={labelStyle}>Paragraph Template</label>
                                                                <button type="button" onClick={() => {
                                                                    const ta = document.getElementById(`para-${field.id}`) as HTMLTextAreaElement | null;
                                                                    if (!ta) return;
                                                                    const s = ta.selectionStart, e = ta.selectionEnd;
                                                                    const nv = `${ta.value.slice(0, s)}[____]${ta.value.slice(e)}`;
                                                                    updateField(stepIndex, fi, f => ({ ...f, options: [nv] }));
                                                                    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + 6, s + 6); }, 10);
                                                                }} style={{ ...btnSmall, color: '#2563eb' }}><Plus size={10} /> Blank</button>
                                                            </div>
                                                            <textarea id={`para-${field.id}`} value={field.options?.[0] || ''}
                                                                onChange={e => updateField(stepIndex, fi, f => ({ ...f, options: [e.target.value] }))}
                                                                placeholder="I request approval for [____] from [____] to [____]."
                                                                style={{ ...inputStyle, minHeight: '90px', fontFamily: 'monospace', lineHeight: '1.5', whiteSpace: 'pre', resize: 'vertical' }} />
                                                            <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>Use <b>[____]</b> for blanks.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Add field after this card */}
                                        <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                                            <button type="button" onClick={() => updateStep(stepIndex, s => { const nf = [...s.fields]; nf.splice(fi + 1, 0, createBuilderField()); return { ...s, fields: nf }; })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '4px', transition: 'color 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = '#2563eb'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; }}>
                                                <Plus size={11} /> Add Field
                                            </button>
                                        </div>
                                    </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Step */}
                <button type="button" onClick={() => onStepsChange([...builderSteps, { status: '', approval_roles: [], fields: [createBuilderField()] }])}
                    style={{ width: '100%', padding: '12px', background: '#fff', border: '2px dashed #bfdbfe', borderRadius: '10px', color: '#2563eb', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '16px' }}>
                    <Plus size={14} /> Add New Step
                </button>
            </main>

            {/* ── RIGHT PANEL: Preview ────────────────────────────────────────── */}
            <FormBuilderPreview
                formName={newFormName}
                formDescription={newFormDesc}
                steps={builderSteps}
                previewEnabled={previewEnabled}
                previewData={previewData}
                availableRoles={availableRoles}
                onToggle={() => setPreviewEnabled(c => !c)}
                onPreviewDataChange={setPreviewData}
            />
        </div>
    );
}
