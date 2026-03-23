'use client';
// ─── CreateFormView ────────────────────────────────────────────────────────────
// Admin form builder: create/edit form types with steps, fields, and roles.

import React from 'react';
import { Plus, Trash2, CheckCircle, Loader2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
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
    // For field reordering within a stage
    const [draggedIdx, setDraggedIdx] = React.useState<{ step: number; field: number } | null>(null);
    const [dragOverIdx, setDragOverIdx] = React.useState<{ step: number; field: number } | null>(null);
    const [draggableIdx, setDraggableIdx] = React.useState<{ step: number; field: number } | null>(null);

    const updateStep = (idx: number, partial: Partial<BuilderStep>) => {
        const next = [...builderSteps];
        next[idx] = { ...next[idx], ...partial };
        onStepsChange(next);
    };

    const handleFieldDragStart = (stepIdx: number, fieldIdx: number) => {
        setDraggedIdx({ step: stepIdx, field: fieldIdx });
    };

    const handleFieldDragOver = (e: React.DragEvent, stepIdx: number, fieldIdx: number) => {
        e.preventDefault();
        setDragOverIdx({ step: stepIdx, field: fieldIdx });
    };

    const handleFieldDrop = (targetStepIdx: number, targetFieldIdx: number) => {
        if (!draggedIdx) {
            setDraggedIdx(null);
            setDragOverIdx(null);
            return;
        }

        const next = [...builderSteps];
        const sourceStepFields = [...next[draggedIdx.step].fields];
        const [movedField] = sourceStepFields.splice(draggedIdx.field, 1);

        if (draggedIdx.step === targetStepIdx) {
            sourceStepFields.splice(targetFieldIdx, 0, movedField);
            next[draggedIdx.step] = { ...next[draggedIdx.step], fields: sourceStepFields };
        } else {
            const targetStepFields = [...next[targetStepIdx].fields];
            targetStepFields.splice(targetFieldIdx, 0, movedField);
            next[draggedIdx.step] = { ...next[draggedIdx.step], fields: sourceStepFields };
            next[targetStepIdx] = { ...next[targetStepIdx], fields: targetStepFields };
        }

        onStepsChange(next);
        setDraggedIdx(null);
        setDragOverIdx(null);
    };

    const scrollToStep = (index: number) => {
        const el = document.getElementById(`step-${index}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', padding: '32px 40px', maxWidth: '1400px', margin: '0 auto', alignItems: 'flex-start' }}>
            {/* ── Left Sidebar (Sticky) ── */}
            <div style={{ position: 'sticky', top: '32px', width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Panel title="Form Steps">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '4px' }}>
                        {builderSteps.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => scrollToStep(idx)}
                                style={{
                                    textAlign: 'left', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                            >
                                <span style={{ fontWeight: 700, color: '#2563eb', marginRight: '6px' }}>{idx + 1}.</span>
                                {step.status || `Step ${idx + 1}`}
                            </button>
                        ))}
                    </div>
                </Panel>
            </div>

            {/* ── Main Canvas ── */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: '740px', paddingBottom: '40px' }}>
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
                    <div key={stepIndex} id={`step-${stepIndex}`}>
                        <Panel title={`Step ${stepIndex + 1}`}>
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

                            {/* Step Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                <button onClick={() => {
                                    const next = [...builderSteps];
                                    next.splice(stepIndex + 1, 0, { status: '', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] });
                                    onStepsChange(next);
                                }} style={{ padding: '6px 10px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    <Plus size={14} /> Add Step After
                                </button>
                                {builderSteps.length > 1 && (
                                    <button onClick={() => {
                                        if (window.confirm('Remove this step?')) {
                                            const next = [...builderSteps];
                                            next.splice(stepIndex, 1);
                                            onStepsChange(next);
                                        }
                                    }} style={{ padding: '6px 10px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        <Trash2 size={14} /> Remove Step
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Fields list */}
                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '100px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>Fields for this step</div>
                            {step.fields.length === 0 && (
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx({ step: stepIndex, field: 0 }); }}
                                    onDrop={(e) => { e.stopPropagation(); handleFieldDrop(stepIndex, 0); }}
                                    style={{ 
                                        padding: '24px', 
                                        textAlign: 'center', 
                                        border: dragOverIdx?.step === stepIndex ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
                                        borderRadius: '8px',
                                        color: '#9ca3af',
                                        marginBottom: '12px',
                                        background: dragOverIdx?.step === stepIndex ? '#eff6ff' : 'transparent',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    Drop a field here
                                </div>
                            )}
                            {step.fields.map((field, fieldIndex) => {
                                const isDragging = draggedIdx?.step === stepIndex && draggedIdx?.field === fieldIndex;
                                const isOver = dragOverIdx?.step === stepIndex && dragOverIdx?.field === fieldIndex && !isDragging;
                                const dragOverTop = isOver && (!draggedIdx || draggedIdx.step !== stepIndex || draggedIdx.field > fieldIndex);
                                const dragOverBottom = isOver && draggedIdx?.step === stepIndex && draggedIdx?.field < fieldIndex;

                                return (
                                    <div 
                                        key={fieldIndex} 
                                        draggable={draggableIdx?.step === stepIndex && draggableIdx?.field === fieldIndex}
                                        onDragStart={() => handleFieldDragStart(stepIndex, fieldIndex)}
                                        onDragOver={(e) => handleFieldDragOver(e, stepIndex, fieldIndex)}
                                        onDrop={(e) => { e.stopPropagation(); handleFieldDrop(stepIndex, fieldIndex); }}
                                        onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); setDraggableIdx(null); }}
                                        style={{ 
                                            marginBottom: '12px', 
                                            padding: '12px',
                                            paddingBottom: '16px',
                                            background: isOver ? '#f8fafc' : (field.type === 'heading' ? '#f3f4f6' : 'transparent'),
                                            borderRadius: '8px',
                                            opacity: isDragging ? 0.2 : 1,
                                            transition: 'all 0.2s ease',
                                            borderBottom: fieldIndex < step.fields.length - 1 ? '1px dashed #d1d5db' : '1px solid transparent',
                                            borderLeft: field.type === 'heading' ? '4px solid #4b5563' : '4px solid transparent',
                                            position: 'relative'
                                        }}
                                    >
                                        {dragOverTop && (
                                            <div style={{ position: 'absolute', top: '-2px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10, boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />
                                        )}
                                        {dragOverBottom && (
                                            <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '4px', background: '#3b82f6', borderRadius: '2px', zIndex: 10, boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />
                                        )}
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                            <div 
                                                onMouseEnter={() => setDraggableIdx({ step: stepIndex, field: fieldIndex })}
                                                onMouseLeave={() => setDraggableIdx(null)}
                                                style={{ marginTop: '30px', color: '#9ca3af', cursor: 'grab', padding: '4px' }}
                                            >
                                                <GripVertical size={18} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                {(() => {
                                                    let displayNum = 0;
                                                    for (let i = 0; i <= fieldIndex; i++) {
                                                        if (step.fields[i].type !== 'heading') displayNum++;
                                                    }
                                                    const isHeading = field.type === 'heading';

                                                    return (
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '8px' }}>
                                                            <div style={{ flex: 2 }}>
                                                                <label style={labelStyle}>
                                                                    {!isHeading && <span style={{ marginRight: '4px' }}>{displayNum}.</span>}
                                                                    {isHeading ? 'Heading Text' : 'Field Name'}
                                                                </label>
                                                                <input value={field.name} onChange={e => {
                                                                    const next = [...builderSteps];
                                                                    next[stepIndex].fields[fieldIndex].name = e.target.value;
                                                                    onStepsChange(next);
                                                                }} placeholder={isHeading ? 'e.g. Personal Details' : 'e.g. Designation'} style={inputStyleSm} />
                                                            </div>
                                                            <div style={{ flex: 1.5 }}>
                                                                <label style={labelStyle}>Field Type</label>
                                                                <div style={{ position: 'relative' }}>
                                                                    <select 
                                                                        value={field.type} 
                                                                        onChange={e => {
                                                                            const next = [...builderSteps];
                                                                            const val = e.target.value;
                                                                            next[stepIndex].fields[fieldIndex].type = val;
                                                                            if (val === 'heading') {
                                                                                next[stepIndex].fields[fieldIndex].required = false;
                                                                            }
                                                                            onStepsChange(next);
                                                                        }} 
                                                                        style={{ 
                                                                            ...inputStyleSm, 
                                                                            background: '#fff', 
                                                                            cursor: 'pointer',
                                                                            appearance: 'none',
                                                                            paddingRight: '30px',
                                                                            border: '1.5px solid #3b82f6',
                                                                            fontWeight: 600,
                                                                            color: '#1e40af',
                                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                        }}
                                                                    >
                                                                        <optgroup label="📝 BASIC INPUTS">
                                                                            <option value="text">📄 Text (Short)</option>
                                                                            <option value="textarea">📝 Text (Long / Paragraph)</option>
                                                                            <option value="number">🔢 Number</option>
                                                                            <option value="select">⌄ Dropdown Select</option>
                                                                            <option value="bool">☑ Yes / No Toggle</option>
                                                                        </optgroup>
                                                                        <optgroup label="📅 DATES">
                                                                            <option value="date">📅 Single Date</option>
                                                                            <option value="date_from_to">↔ Date Range (From - To)</option>
                                                                        </optgroup>
                                                                        <optgroup label="👤 PROFILE (AUTO-FILL)">
                                                                            <option value="name">👤 Full Name</option>
                                                                            <option value="designation">👔 Designation</option>
                                                                            <option value="employee_code">🆔 Employee Code</option>
                                                                            <option value="department">🏢 Department</option>
                                                                            <option value="role">🔑 System Role</option>
                                                                            <option value="signature">✍ Signature</option>
                                                                        </optgroup>
                                                                        <optgroup label="🏗️ STRUCTURAL">
                                                                            <option value="heading">🏷️ Section Heading</option>
                                                                            <option value="paragraph_blanks">🖋️ Paragraph with Blanks</option>
                                                                            <option value="tuple">📦 Data Group (Tuple)</option>
                                                                            <option value="list">📋 Repeating List</option>
                                                                        </optgroup>
                                                                    </select>
                                                                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#3b82f6' }}>
                                                                        <ChevronDown size={14} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px', gap: '4px' }}>
                                                                {field.type !== 'heading' && (
                                                                    <>
                                                                        <input type="checkbox" checked={field.required} onChange={e => {
                                                                            const next = [...builderSteps];
                                                                            next[stepIndex].fields[fieldIndex].required = e.target.checked;
                                                                            onStepsChange(next);
                                                                        }} />
                                                                        <label style={{ fontSize: '12px', color: '#4b5563', marginRight: '8px' }}>Required</label>
                                                                    </>
                                                                )}
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm('Remove this field?')) {
                                                                            const next = [...builderSteps];
                                                                            next[stepIndex].fields.splice(fieldIndex, 1);
                                                                            onStepsChange(next);
                                                                        }
                                                                    }} 
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: isHeading ? '8px' : '0' }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

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
                                                            <React.Fragment key={sfIdx}>
                                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', minWidth: '18px' }}>{sfIdx + 1}.</span>
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
                                                                        const oldType = sfs[sfIdx].type;
                                                                        sfs[sfIdx] = { ...sfs[sfIdx], type: e.target.value };
                                                                        
                                                                        // Initialize options for select type
                                                                        if (e.target.value === 'select' && (!sfs[sfIdx].options || sfs[sfIdx].options.length === 0)) {
                                                                            sfs[sfIdx].options = ['Option 1'];
                                                                        }
                                                                        
                                                                        next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                        onStepsChange(next);
                                                                    }} style={{ ...inputStyleSm, flex: 1, background: '#fff' }}>
                                                                        {['text', 'number', 'date', 'date_from_to', 'bool', 'select'].map(t => (
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

                                                                {/* Select Options for Column */}
                                                                {sf.type === 'select' && (
                                                                    <div style={{ marginLeft: '24px', marginBottom: '10px', padding: '10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', marginBottom: '8px', textTransform: 'uppercase' }}>Column Options</div>
                                                                        {(sf.options || []).map((opt, optIdx) => (
                                                                            <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                                                <input 
                                                                                    value={opt} 
                                                                                    onChange={e => {
                                                                                        const next = [...builderSteps];
                                                                                        const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                                                        const opts = [...(sfs[sfIdx].options || [])];
                                                                                        opts[optIdx] = e.target.value;
                                                                                        sfs[sfIdx].options = opts;
                                                                                        next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                                        onStepsChange(next);
                                                                                    }} 
                                                                                    placeholder={`Option ${optIdx + 1}`} 
                                                                                    style={{ ...inputStyleSm, padding: '5px 8px', fontSize: '11px', flex: 1 }} 
                                                                                />
                                                                                <button type="button" onClick={() => {
                                                                                    const next = [...builderSteps];
                                                                                    const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                                                    const opts = [...(sfs[sfIdx].options || [])];
                                                                                    opts.splice(optIdx, 1);
                                                                                    sfs[sfIdx].options = opts;
                                                                                    next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                                    onStepsChange(next);
                                                                                }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>×</button>
                                                                            </div>
                                                                        ))}
                                                                        <button type="button" onClick={() => {
                                                                            const next = [...builderSteps];
                                                                            const sfs = [...(next[stepIndex].fields[fieldIndex].subFields || [])];
                                                                            const opts = [...(sfs[sfIdx].options || []), ''];
                                                                            sfs[sfIdx].options = opts;
                                                                            next[stepIndex].fields[fieldIndex].subFields = sfs;
                                                                            onStepsChange(next);
                                                                        }} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#2563eb', background: '#f0f7ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                                                                            <Plus size={12} /> Add Option
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </React.Fragment>
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

                                                {/* Paragraph with Blanks */}
                                                {field.type === 'paragraph_blanks' && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                                                            <label style={labelStyle}>Paragraph Template</label>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    const textarea = document.getElementById(`para-${stepIndex}-${fieldIndex}`) as HTMLTextAreaElement;
                                                                    if (!textarea) return;
                                                                    const start = textarea.selectionStart;
                                                                    const end = textarea.selectionEnd;
                                                                    const text = textarea.value;
                                                                    const nextText = text.substring(0, start) + '[____]' + text.substring(end);
                                                                    
                                                                    const next = [...builderSteps];
                                                                    next[stepIndex].fields[fieldIndex].options = [nextText];
                                                                    onStepsChange(next);
                                                                    
                                                                    // Restore focus after state update
                                                                    setTimeout(() => {
                                                                        textarea.focus();
                                                                        textarea.setSelectionRange(start + 6, start + 6);
                                                                    }, 10);
                                                                }}
                                                                style={{ fontSize: '11px', padding: '2px 8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, marginBottom: '2px' }}
                                                            >
                                                                + Insert Blank
                                                            </button>
                                                        </div>
                                                        <textarea 
                                                            id={`para-${stepIndex}-${fieldIndex}`}
                                                            value={field.options?.[0] || ''} 
                                                            onChange={e => {
                                                                const next = [...builderSteps];
                                                                next[stepIndex].fields[fieldIndex].options = [e.target.value];
                                                                onStepsChange(next);
                                                            }} 
                                                            placeholder="e.g. My name is [____] and I work at [____]."
                                                            style={{ 
                                                                ...inputStyleSm, 
                                                                minHeight: '120px', 
                                                                fontFamily: 'monospace', 
                                                                lineHeight: '1.5',
                                                                whiteSpace: 'pre', // Preserve spaces while typing
                                                                overflowX: 'auto'
                                                            }}
                                                        />
                                                        <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '6px' }}>
                                                            Tip: Use <b>[____]</b> for blanks. Spaces and newlines will be preserved.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <button onClick={() => {
                                const next = [...builderSteps];
                                next[stepIndex].fields.push({ name: '', type: 'text', required: true });
                                onStepsChange(next);
                            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                                <Plus size={14} /> Add Field
                            </button>
                        </div>
                        </Panel>
                    </div>
                ))}

                <button onClick={() => onStepsChange([...builderSteps, { status: '', approval_roles: [], fields: [{ name: '', type: 'text', required: true }] }])}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#dbeafe', border: '1px dashed #3b82f6', color: '#1d4ed8', padding: '12px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    <Plus size={16} /> Add new Step
                </button>
            </div>
            </div>

            {/* ── Right Sidebar (Sticky) ── */}
            <div style={{ position: 'sticky', top: '50vh', transform: 'translateY(-50%)', width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Panel title="Quick Actions">
                    <button onClick={onSave} disabled={creating} style={{ width: '100%', padding: '10px 16px', border: 'none', background: creating ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)', marginBottom: '12px' }}>
                        {creating ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle size={14} /> Save Form</>}
                    </button>
                    <button onClick={onCancel} style={{ width: '100%', padding: '10px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        Cancel
                    </button>
                </Panel>
            </div>
        </div>
    );
}
