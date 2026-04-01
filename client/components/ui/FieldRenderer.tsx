'use client';
// ─── FieldRenderer ─────────────────────────────────────────────────────────────
// Renders any schema field type. Used in both form-fill and approval panels,
// eliminating the duplicated switch-case logic that existed in page.tsx.

import React from 'react';
import { Upload, ShieldCheck } from 'lucide-react';
import ListField from './ListField';
import TupleField from './TupleField';
import { FieldDef } from '@/types';

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

interface FieldRendererProps {
    field: FieldDef;
    value: unknown;
    onChange: (key: string, value: unknown) => void;
    /** For date_from_to — companion "from" or "to" value */
    fromValue?: string;
    toValue?: string;
    /** For signature field — saved profile signature URL */
    profileSignatureUrl?: string | null;
    /** For signature upload button when no signature saved */
    onSignatureUpload?: (file: File) => void;
    sigUploading?: boolean;
    /** For department/role drop-downs */
    availableDepartments?: { id: string | number; name: string }[];
    availableRoles?: string[];
    /** Whether this field was auto-filled from the user's profile */
    isAutoFilled?: boolean;
}

export default function FieldRenderer({
    field,
    value,
    onChange,
    fromValue,
    toValue,
    profileSignatureUrl,
    onSignatureUpload,
    sigUploading,
    availableDepartments = [],
    availableRoles = [],
    isAutoFilled = false,
}: FieldRendererProps) {
    const { key, type, options } = field;
    const numericMin = typeof field.min === 'number' ? field.min : undefined;
    const numericMax = typeof field.max === 'number' ? field.max : undefined;
    const stringValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';

    const currentInputStyle = {
        ...inputStyle,
        background: isAutoFilled ? '#9cb5f339' : (inputStyle.background || '#ffffff'),
        transition: 'background-color 0.3s ease, border-color 0.2s',
    };

    if (type === 'textarea') {
        return (
            <textarea value={stringValue} onChange={e => onChange(key, e.target.value)} rows={3} style={inputStyle} />
        );
    }

    if (type === 'select') {
        return (
            <select value={stringValue} onChange={e => onChange(key, e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                <option value="">Select...</option>
                {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (type === 'bool') {
        return (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minHeight: '40px', padding: '0 4px', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={value === true || value === 'true'}
                    onChange={e => onChange(key, e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '13px', color: '#374151' }}>{value === true || value === 'true' ? 'Yes' : 'No'}</span>
            </label>
        );
    }

    if (type === 'department' || type === 'role') {
        const optionList = type === 'department'
            ? availableDepartments.map(d => d.name)
            : availableRoles;
        const placeholder = type === 'department' ? 'Select Department...' : 'Select Role...';
        const currentValue = typeof value === 'string' ? value : '';
        const normalizedOptions = Array.from(new Set([currentValue, ...optionList].filter(Boolean)));

        return (
            <select value={currentValue} onChange={e => onChange(key, e.target.value)} style={currentInputStyle}>
                <option value="">{placeholder}</option>
                {normalizedOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (type === 'date_from_to') {
        return (
            <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={fromValue || ''}
                    onChange={e => {
                        const val = e.target.value;
                        if (toValue && val > toValue) { alert('From Date cannot be later than To Date'); }
                        else { onChange(`${key}_from`, val); }
                    }}
                    style={{ ...inputStyle, flex: 1 }} />
                <span style={{ display: 'flex', alignItems: 'center', color: '#6b7280' }}>to</span>
                <input type="date" value={toValue || ''}
                    onChange={e => {
                        const val = e.target.value;
                        if (fromValue && val < fromValue) { alert('To Date cannot be earlier than From Date'); }
                        else { onChange(`${key}_to`, val); }
                    }}
                    style={{ ...inputStyle, flex: 1 }} />
            </div>
        );
    }

    if (type === 'signature') {
        if (profileSignatureUrl) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                        <input type="checkbox" checked={value === profileSignatureUrl}
                            onChange={e => onChange(key, e.target.checked ? profileSignatureUrl : '')}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }} />
                        Attach my saved signature
                        <div style={{
                            marginLeft: 'auto',
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', background: '#ecfdf5', color: '#059669',
                            borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            border: '1px solid #d1fae5',
                        }}>
                            <ShieldCheck size={12} /> Signature on file
                        </div>
                    </label>
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>No signature saved in profile.</span>
                    {onSignatureUpload && (
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', color: '#2563eb', cursor: 'pointer', background: '#fff', fontWeight: 600 }}>
                            <Upload size={12} />
                            {sigUploading ? 'Uploading...' : 'Upload Now'}
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={async e => { if (e.target.files?.[0]) onSignatureUpload(e.target.files[0]); }} />
                        </label>
                    )}
                </div>
            </div>
        );
    }

    if (type === 'list') {
        return (
            <ListField fieldKey={key} subFields={field.subFields || []} value={Array.isArray(value) ? value : []} onChange={v => onChange(key, v)} />
        );
    }

    if (type === 'tuple') {
        return (
            <TupleField fieldKey={key} subFields={field.subFields || []} value={value || {}} onChange={v => onChange(key, v)} />
        );
    }

    if (type === 'date_today') {
        return (
            <input
                type="date"
                value={typeof value === 'string' ? value : ''}
                onChange={e => onChange(key, e.target.value)}
                readOnly
                style={{
                    ...currentInputStyle,
                    background: '#f3f4f6',
                    cursor: 'not-allowed',
                    color: '#6b7280',
                }}
            />
        );
    }

    if (type === 'name' || type === 'designation' || type === 'employee_code') {
        const placeholders: Record<string, string> = {
            name: 'Enter full name',
            designation: 'Enter designation',
            employee_code: 'Enter employee code',
        };
        return (
            <input
                type="text"
                value={stringValue}
                onChange={e => onChange(key, e.target.value)}
                placeholder={placeholders[type]}
                style={currentInputStyle}
            />
        );
    }

    if (type === 'paragraph_blanks') {
        const template = options?.[0] || '';
        const blankTokenPattern = /\[_{2,}\]/g;
        const segments = template.split(blankTokenPattern);
        const blankCount = (template.match(blankTokenPattern) || []).length;
        const values = Array.isArray(value) ? value : [];

        return (
            <div style={{
                lineHeight: '2',
                fontSize: '15px',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}>
                {segments.map((segment, idx) => (
                    <React.Fragment key={idx}>
                        {segment && <span>{segment}</span>}
                        {idx < blankCount && (
                            <input
                                type="text"
                                value={typeof values[idx] === 'string' ? values[idx] : ''}
                                onChange={e => {
                                    const next = [...values];
                                    next[idx] = e.target.value;
                                    onChange(key, next);
                                }}
                                placeholder=" "
                                style={{
                                    display: 'inline-block',
                                    width: `${Math.max((values[idx] || '').length + 2, 10)}ch`,
                                    minWidth: '90px',
                                    margin: '0 4px',
                                    padding: '2px 4px',
                                    border: 'none',
                                    borderBottom: '1px solid #94a3b8',
                                    borderRadius: 0,
                                    outline: 'none',
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    lineHeight: 'inherit',
                                    color: 'inherit',
                                    background: 'transparent',
                                    verticalAlign: 'baseline',
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <input
            type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={type === 'number' ? (typeof value === 'number' || typeof value === 'string' ? value : '') : stringValue}
            min={type === 'number' ? numericMin : undefined}
            max={type === 'number' ? numericMax : undefined}
            onChange={e => onChange(key, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
            style={inputStyle}
        />
    );
}
