'use client';
// ─── FieldRenderer ─────────────────────────────────────────────────────────────
// Renders any schema field type. Used in both form-fill and approval panels,
// eliminating the duplicated switch-case logic that existed in page.tsx.

import React from 'react';
import { Upload, ShieldCheck } from 'lucide-react';
import SignaturePad from './SignaturePad';
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
    value: any;
    onChange: (key: string, value: any) => void;
    /** For date_from_to — companion "from" or "to" value */
    fromValue?: string;
    toValue?: string;
    /** For signature field — saved profile signature URL */
    profileSignatureUrl?: string | null;
    /** For signature upload button when no signature saved */
    onSignatureUpload?: (file: File) => void;
    sigUploading?: boolean;
    /** For department/role drop-downs */
    availableDepartments?: any[];
    availableRoles?: string[];
    /** Backend base URL for rendering saved signatures */
    apiBaseUrl?: string;
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
    apiBaseUrl = 'http://localhost:4000',
    isAutoFilled = false,
}: FieldRendererProps) {
    const { key, type, options } = field;

    const currentInputStyle = {
        ...inputStyle,
        background: isAutoFilled ? '#9cb5f339' : (inputStyle.background || '#ffffff'),
        transition: 'background-color 0.3s ease, border-color 0.2s',
    };

    if (type === 'textarea') {
        return (
            <textarea value={value || ''} onChange={e => onChange(key, e.target.value)} rows={3} style={inputStyle} />
        );
    }

    if (type === 'select') {
        return (
            <select value={value || ''} onChange={e => onChange(key, e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
                <option value="">Select...</option>
                {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (type === 'bool') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', height: '100%', padding: '0 8px' }}>
                <input type="checkbox" checked={value === true || value === 'true'} onChange={e => onChange(key, e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }} />
            </div>
        );
    }

    if (type === 'department') {
        return (
            <select value={value || ''} onChange={e => onChange(key, e.target.value)} style={currentInputStyle}>
                <option value="">Select Department...</option>
                {availableDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
        );
    }

    if (type === 'role') {
        return (
            <select value={value || ''} onChange={e => onChange(key, e.target.value)} style={currentInputStyle}>
                <option value="">Select Role...</option>
                {availableRoles.map(o => <option key={o} value={o}>{o}</option>)}
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

    if (type === 'name' || type === 'designation' || type === 'employee_code' || type === 'date_today') {
        const placeholders: Record<string, string> = {
            name: 'Enter full name',
            designation: 'Enter designation',
            employee_code: 'Enter employee code',
            date_today: 'Today\'s date',
        };
        return (
            <input
                type="text"
                value={value || ''}
                onChange={e => onChange(key, e.target.value)}
                readOnly={type === 'date_today'}
                placeholder={placeholders[type]}
                style={{
                    ...currentInputStyle,
                    background: type === 'date_today' ? '#f3f4f6' : (currentInputStyle.background || '#ffffff'),
                    cursor: type === 'date_today' ? 'not-allowed' : 'text',
                    color: type === 'date_today' ? '#6b7280' : (currentInputStyle.color || '#1f2937'),
                }}
            />
        );
    }

    if (type === 'paragraph_blanks') {
        const template = options?.[0] || '';
        const segments = template.split('[____]');
        const values = Array.isArray(value) ? value : [];

        return (
            <div style={{ 
                lineHeight: '1.8', 
                fontSize: '15px', 
                color: '#374151',
                padding: '0', // Full width, no extra padding inside container
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
            }}>
                {segments.map((segment, idx) => (
                    <React.Fragment key={idx}>
                        <span style={{ verticalAlign: 'baseline' }}>{segment}</span>
                        {idx < segments.length - 1 && (
                            <span 
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                onBlur={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    const nextValue = e.currentTarget.innerText;
                                    const next = [...values];
                                    next[idx] = nextValue;
                                    onChange(key, next);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.preventDefault();
                                }}
                                style={{
                                    display: 'inline',
                                    borderBottom: '1px solid #94a3b8',
                                    background: 'transparent',
                                    padding: '0 2px',
                                    margin: '0 1px',
                                    outline: 'none',
                                    fontWeight: 400,
                                    color: 'inherit',
                                    cursor: 'text',
                                    verticalAlign: 'baseline',
                                    wordBreak: 'break-word',
                                    transition: 'background 0.2s',
                                    minWidth: '60px',   
                                }}
                            >
                                {values[idx] || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    // Default: text, number, date, tuple
    return (
        <input type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={value || ''} onChange={e => onChange(key, e.target.value)} style={inputStyle} />
    );
}
