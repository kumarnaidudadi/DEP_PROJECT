'use client';
// ─── CreateFormView ────────────────────────────────────────────────────────────
// Admin form builder: create/edit form types with steps, fields, and roles.

import React from 'react';
import { Plus, Trash2, CheckCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { BuilderStep, FIELD_TYPES, FIELD_TYPE_LABELS } from '@/types';

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};
const inputStyleSm: React.CSSProperties = { ...inputStyle, padding: '7px 10px', fontSize: '12px' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' };

function Panel({ title, children, style = {} }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb', ...style }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
            {children}
        </div>
    );
}

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

export default function CreateFormView({
    isEdit, newFormName, newFormDesc, builderSteps, availableRoles,
    creating, createSuccess, onNameChange, onDescChange, onStepsChange, onSave, onCancel,
}: Props) {

    const updateStep = (idx: number, partial: Partial<BuilderStep>) => {
        const next = [...builderSteps];
        next[idx] = { ...next[idx], ...partial };
        onStepsChange(next);
    };

    return (
        <div style={{ padding: '32px 40px', maxWidth: '740px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                {isEdit ? 'Edit Form' : 'Create New Form'}
            </h1>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>
                Define a custom application form with fields and approval workflow.
            </p>

            {createSuccess && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#166534', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> Form {isEdit ? 'updated' : 'created'} successfully!
                </div>
            )}

            {/* Basic info */}
            <Panel title="Form Details">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Form Title *</label>
                        <input value={newFormName} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Leave Application" style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Description</label>
                        <input value={newFormDesc} onChange={e => onDescChange(e.target.value)} placeholder="Brief description..." style={inputStyle} />
                    </div>
                </div>
            </Panel>

            {/* Step builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {builderSteps.map((step, stepIndex) => (
                    <Panel key={stepIndex} title={`Step ${stepIndex + 1}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            {/* Status name */}
                            <div style={{ flex: 1, marginRight: '16px' }}>
                                <label style={labelStyle}>Status Name *</label>
                                <input value={step.status} onChange={e => updateStep(stepIndex, { status: e.target.value })} placeholder="e.g. HOD Approval" style={inputStyle} />
                            </div>

                            {/* Approval roles */}
                            <div style={{ flex: 1, marginRight: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>Approval Roles</label>
                                    <button type="button" onClick={() => updateStep(stepIndex, { showAllRoles: !step.showAllRoles })}
                                        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#3b82f6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                        {step.showAllRoles ? <ChevronDown size={14} style={{ marginRight: '4px' }} /> : <ChevronRight size={14} style={{ marginRight: '4px' }} />}
                                        {step.showAllRoles ? 'Hide extra roles' : 'Show all roles'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px' }}>
                                    {availableRoles.map(role => {
                                        const isPrimary = ['HEAD_OF_DEPARTMENT', 'SECTION_INCHARGE', 'AR_DR_ESTT', 'REGISTRAR'].includes(role);
                                        const selected = step.approval_roles.includes(role);
                                        if (!step.showAllRoles && !isPrimary && !selected) return null;
                                        return (
                                            <button key={role} type="button"
                                                onClick={() => {
                                                    const current = step.approval_roles;
                                                    updateStep(stepIndex, { approval_roles: selected ? current.filter(r => r !== role) : [...current, role] });
                                                }}
                                                style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', background: selected ? '#2563eb' : '#e5e7eb', color: selected ? '#fff' : '#374151', transition: 'all 0.15s' }}>
                                                {role}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Remove step */}
                            {builderSteps.length > 1 && (
                                <button onClick={() => {
                                    if (window.confirm('Remove this step?')) {
                                        const next = [...builderSteps];
                                        next.splice(stepIndex, 1);
                                        onStepsChange(next);
                                    }
                                }} style={{ padding: '8px 12px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, marginTop: '16px' }}>
                                    <Trash2 size={14} /> Remove Step
                                </button>
                            )}
                        </div>

                        {/* Fields list */}
                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>Fields for this step</div>
                            {step.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: fieldIndex < step.fields.length - 1 ? '1px dashed #d1d5db' : 'none' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={labelStyle}>Field Name</label>
                                            <input value={field.name} onChange={e => {
                                                const next = [...builderSteps];
                                                next[stepIndex].fields[fieldIndex].name = e.target.value;
                                                onStepsChange(next);
                                            }} placeholder="e.g. designation" style={inputStyleSm} />
                                        </div>
                                        <div style={{ flex: 1.5 }}>
                                            <label style={labelStyle}>Type</label>
                                            <select value={field.type} onChange={e => {
                                                const next = [...builderSteps];
                                                next[stepIndex].fields[fieldIndex].type = e.target.value;
                                                onStepsChange(next);
                                            }} style={{ ...inputStyleSm, background: '#fff' }}>
                                                {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px', gap: '4px' }}>
                                            <input type="checkbox" checked={field.required} onChange={e => {
                                                const next = [...builderSteps];
                                                next[stepIndex].fields[fieldIndex].required = e.target.checked;
                                                onStepsChange(next);
                                            }} />
                                            <label style={{ fontSize: '12px', color: '#4b5563', marginRight: '8px' }}>Required</label>
                                            <button onClick={() => {
                                                if (window.confirm('Remove this field?')) {
                                                    const next = [...builderSteps];
                                                    next[stepIndex].fields.splice(fieldIndex, 1);
                                                    onStepsChange(next);
                                                }
                                            }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Select options */}
                                    {field.type === 'select' && (
                                        <div style={{ marginTop: '8px' }}>
                                            <label style={labelStyle}>Options</label>
                                            {(field.options || []).map((opt, optIdx) => (
                                                <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                    <input value={opt} onChange={e => {
                                                        const next = [...builderSteps];
                                                        const opts = [...(next[stepIndex].fields[fieldIndex].options || [])];
                                                        opts[optIdx] = e.target.value;
                                                        next[stepIndex].fields[fieldIndex].options = opts;
                                                        onStepsChange(next);
                                                    }} placeholder={`Option ${optIdx + 1}`} style={{ ...inputStyleSm, flex: 1 }} />
                                                    <button type="button" onClick={() => {
                                                        const next = [...builderSteps];
                                                        const opts = [...(next[stepIndex].fields[fieldIndex].options || [])];
                                                        opts.splice(optIdx, 1);
                                                        next[stepIndex].fields[fieldIndex].options = opts;
                                                        onStepsChange(next);
                                                    }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => {
                                                const next = [...builderSteps];
                                                const opts = [...(next[stepIndex].fields[fieldIndex].options || []), ''];
                                                next[stepIndex].fields[fieldIndex].options = opts;
                                                onStepsChange(next);
                                            }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                                <Plus size={11} /> Add Option
                                            </button>
                                        </div>
                                    )}

                                    {/* Number min/max */}
                                    {field.type === 'number' && (
                                        <div style={{ marginTop: '8px', display: 'flex', gap: '10px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Min value</label>
                                                <input type="number" value={field.min ?? ''} onChange={e => {
                                                    const next = [...builderSteps];
                                                    next[stepIndex].fields[fieldIndex].min = e.target.value === '' ? undefined : Number(e.target.value);
                                                    onStepsChange(next);
                                                }} style={inputStyleSm} placeholder="e.g. 0" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={labelStyle}>Max value</label>
                                                <input type="number" value={field.max ?? ''} onChange={e => {
                                                    const next = [...builderSteps];
                                                    next[stepIndex].fields[fieldIndex].max = e.target.value === '' ? undefined : Number(e.target.value);
                                                    onStepsChange(next);
                                                }} style={inputStyleSm} placeholder="optional" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Tuple/List sub-fields */}
                                    {(field.type === 'tuple' || field.type === 'list') && (
                                        <div style={{ marginTop: '8px', background: '#f0f4ff', borderRadius: '6px', padding: '10px 12px' }}>
                                            <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>Columns</label>
                                            {(field.subFields || []).map((sf, sfIdx) => (
                                                <div key={sfIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                                    <input value={sf.name} onChange={e => {
                                                        const next = [...builderSteps];
                                                        const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                        sfs[sfIdx] = { ...sfs[sfIdx], name: e.target.value };
                                                        next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                        onStepsChange(next);
                                                    }} placeholder="Column name" style={{ ...inputStyleSm, flex: 2 }} />
                                                    <select value={sf.type} onChange={e => {
                                                        const next = [...builderSteps];
                                                        const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                        sfs[sfIdx] = { ...sfs[sfIdx], type: e.target.value };
                                                        next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                        onStepsChange(next);
                                                    }} style={{ ...inputStyleSm, flex: 1, background: '#fff' }}>
                                                        {['text', 'number', 'date', 'bool', 'select'].map(t => (
                                                            <option key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</option>
                                                        ))}
                                                    </select>
                                                    <button type="button" onClick={() => {
                                                        const next = [...builderSteps];
                                                        const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                        sfs.splice(sfIdx, 1);
                                                        next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                        onStepsChange(next);
                                                    }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>×</button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => {
                                                const next = [...builderSteps];
                                                const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || []), { name: '', type: 'text' }];
                                                next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                onStepsChange(next);
                                            }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', background: '#e0e7ff', border: '1px solid #a5b4fc', color: '#3730a3', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                                <Plus size={11} /> Add Column
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button onClick={() => {
                                const next = [...builderSteps];
                                next[stepIndex].fields.push({ name: '', type: 'text', required: true });
                                onStepsChange(next);
                            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                <Plus size={14} /> Add Field
                            </button>
                        </div>
                    </Panel>
                ))}

                <button onClick={() => onStepsChange([...builderSteps, { status: '', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }])}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#dbeafe', border: '1px dashed #3b82f6', color: '#1d4ed8', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={16} /> Add new Step
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', margin: '24px 0' }}>
                <button onClick={onCancel} style={{ padding: '10px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button onClick={onSave} disabled={creating} style={{ padding: '10px 24px', border: 'none', background: creating ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                    {creating ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle size={14} /> Save Form</>}
                </button>
            </div>
        </div>
    );
}
