'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import FieldRenderer from './FieldRenderer';
import { BuilderStep, FieldDef, isFieldVisible } from '@/types';

const previewDepartments = [
    { id: 'dept-1', name: 'Administration' },
    { id: 'dept-2', name: 'Human Resources' },
    { id: 'dept-3', name: 'Finance' },
    { id: 'dept-4', name: 'Operations' },
];

function shouldSpanWide(field: FieldDef) {
    return ['textarea', 'list', 'tuple', 'date_from_to', 'signature', 'name', 'paragraph_blanks'].includes(field.type) || field.label.length > 42;
}

function asOptionalString(value: unknown) {
    return typeof value === 'string' ? value : undefined;
}

function getPreviewValue(field: FieldDef, previewData: Record<string, unknown>, availableRoles: string[]) {
    const explicitValue = previewData[field.key];
    if (explicitValue !== undefined) return explicitValue;

    switch (field.type) {
        case 'name':
            return 'Alex Johnson';
        case 'designation':
            return availableRoles[0] || 'Assistant Professor';
        case 'employee_code':
            return 'EMP-1024';
        case 'department':
            return 'Administration';
        case 'role':
            return availableRoles[0] || '';
        case 'date_today':
            return new Date().toISOString().split('T')[0];
        default:
            return explicitValue;
    }
}

function isPreviewAutoFilled(fieldType: string) {
    return ['name', 'designation', 'employee_code', 'department', 'role', 'date_today'].includes(fieldType);
}

interface FormBuilderPreviewProps {
    formName: string;
    formDescription: string;
    steps: BuilderStep[];
    previewEnabled: boolean;
    previewData: Record<string, unknown>;
    availableRoles: string[];
    onToggle: () => void;
    onPreviewDataChange: (data: Record<string, unknown>) => void;
    isMobile?: boolean;
    rightOpen?: boolean;
    setRightOpen?: (v: boolean) => void;
}

export default function FormBuilderPreview({
    formName, formDescription, steps, previewEnabled,
    previewData, availableRoles, onToggle, onPreviewDataChange,
    isMobile = false, rightOpen = false, setRightOpen,
}: FormBuilderPreviewProps) {
    const handleFieldChange = React.useCallback((key: string, value: unknown) => {
        onPreviewDataChange({ ...previewData, [key]: value });
    }, [onPreviewDataChange, previewData]);

    const asideStyle: React.CSSProperties = isMobile ? {
        position: 'fixed',
        right: rightOpen ? 0 : '-360px',
        top: 0,
        bottom: 0,
        width: '340px',
        zIndex: 50,
        background: '#f8fafc',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '24px 16px',
        overflowY: 'auto'
    } : {
        width: '340px', flexShrink: 0, position: 'sticky', top: '24px', alignSelf: 'flex-start'
    };

    return (
        <React.Fragment>
            {isMobile && rightOpen && (
                <div onClick={() => setRightOpen?.(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 45, backdropFilter: 'blur(2px)' }} />
            )}
            <aside style={asideStyle}>
                {isMobile && (
                    <button type="button" onClick={() => setRightOpen?.(false)} style={{ marginBottom: '16px', background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>← Back to Form Setup</span>
                    </button>
                )}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Live Preview</div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Applicant experience</div>
                        </div>
                        <button type="button" onClick={onToggle}
                            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280' }}>
                            {previewEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                            {previewEnabled ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {previewEnabled ? (
                        <div style={{ maxHeight: isMobile ? 'calc(100vh - 12rem)' : 'calc(100vh - 10rem)', overflowY: 'auto', padding: '14px' }}>
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px' }}>
                                {/* Title */}
                                <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '14px' }}>
                                    <div style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 8px', marginBottom: '8px' }}>
                                        Applicant View
                                    </div>
                                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                                        {formName.trim() || 'Untitled Form'}
                                    </h2>
                                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', lineHeight: '1.5' }}>
                                        {formDescription.trim() || 'Preview of the form as applicants will see it.'}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {steps.map((step, stepIndex) => {
                                        let displayNumber = 0;

                                        const previewFields = step.fields
                                            .filter(f => f.name.trim())
                                            .map(f => {
                                                if (f.type === 'heading') {
                                                    return { key: f.id, label: f.name, type: f.type, required: false, helpText: f.helpText, conditionalLogic: f.conditionalLogic } satisfies FieldDef;
                                                }
                                                displayNumber += 1;
                                                return {
                                                    key: f.id, label: `${displayNumber}. ${f.name}`, type: f.type,
                                                    required: f.required, options: f.options, min: f.min, max: f.max,
                                                    helpText: f.helpText, conditionalLogic: f.conditionalLogic,
                                                    subFields: f.subFields?.map((sf, i) => ({
                                                        key: `${f.id}_sub_${i + 1}`, label: `${i + 1}. ${sf.name || `Column ${i + 1}`}`,
                                                        type: sf.type, options: sf.options, min: sf.min, max: sf.max,
                                                    })),
                                                } satisfies FieldDef;
                                            });

                                        const visible = previewFields.filter(f => f.type === 'heading' || isFieldVisible(f, previewData));
                                        if (visible.length === 0) return null;

                                        return (
                                            <section key={`${step.status}-${stepIndex}`} style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb' }}>
                                                    <div>
                                                        {steps.length > 1 && <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Step {stepIndex + 1}</div>}
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginTop: '2px' }}>{step.status || `Step ${stepIndex + 1}`}</div>
                                                    </div>
                                                    {step.approval_roles.length > 0 && (
                                                        <span style={{ fontSize: '11px', color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '20px', padding: '2px 8px' }}>
                                                            {step.approval_roles.length} approver{step.approval_roles.length > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    {visible.map(field => {
                                                        if (field.type === 'heading') {
                                                            return (
                                                                <div key={field.key} style={{ gridColumn: 'span 2', paddingTop: '4px' }}>
                                                                    <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', fontSize: '13px', fontWeight: 700, color: '#374151' }}>{field.label}</div>
                                                                    {field.helpText && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{field.helpText}</p>}
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div key={field.key} style={{ gridColumn: shouldSpanWide(field) ? 'span 2' : 'span 1' }}>
                                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                                                                    {field.label}
                                                                    {field.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
                                                                </label>
                                                                {field.helpText && <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '5px', lineHeight: '1.4' }}>{field.helpText}</p>}
                                                                <FieldRenderer
                                                                    field={field}
                                                                    value={field.type === 'date_from_to' ? undefined : getPreviewValue(field, previewData, availableRoles)}
                                                                    fromValue={asOptionalString(previewData[`${field.key}_from`])}
                                                                    toValue={asOptionalString(previewData[`${field.key}_to`])}
                                                                    onChange={handleFieldChange}
                                                                    availableDepartments={previewDepartments}
                                                                    availableRoles={availableRoles}
                                                                    isAutoFilled={isPreviewAutoFilled(field.type)}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>

                                {steps.every(s => s.fields.every(f => !f.name.trim())) && (
                                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
                                        Add fields to see the preview.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '24px', fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
                            Click &quot;Show&quot; to enable the live form preview.
                        </div>
                    )}
                </div>
            </aside>
        </React.Fragment>
    );
}
