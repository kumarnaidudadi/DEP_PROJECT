'use client';
// ─── TupleField ────────────────────────────────────────────────────────────────
// Inline group input for 'tuple' type schema fields.

import React from 'react';

interface SubField {
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
}

interface TupleFieldProps {
    fieldKey: string;
    subFields: SubField[];
    value: Record<string, any>;
    onChange: (val: Record<string, any>) => void;
}

export default function TupleField({ subFields, value, onChange }: TupleFieldProps) {
    const updateCell = (colKey: string, val: any) =>
        onChange({ ...value, [colKey]: val });

    if (subFields.length === 0) return (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
            No columns defined for this group. Configure them in the Form Builder.
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
            {subFields.map(sf => (
                <div key={sf.key} style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>
                        {sf.label}
                    </label>
                    {sf.type === 'date_from_to' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                    type="date"
                                    value={value[`${sf.key}_from`] ?? ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const toVal = value[`${sf.key}_to`];
                                        if (toVal && val > toVal) {
                                            alert('From Date cannot be later than To Date');
                                        } else {
                                            updateCell(`${sf.key}_from`, val);
                                        }
                                    }}
                                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                                />
                                <span style={{ display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '11px' }}>to</span>
                                <input
                                    type="date"
                                    value={value[`${sf.key}_to`] ?? ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const fromVal = value[`${sf.key}_from`];
                                        if (fromVal && val < fromVal) {
                                            alert('To Date cannot be earlier than From Date');
                                        } else {
                                            updateCell(`${sf.key}_to`, val);
                                        }
                                    }}
                                    style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                                />
                        </div>
                    ) : sf.type === 'select' ? (
                        <select
                            value={value[sf.key] ?? ''}
                            onChange={e => updateCell(sf.key, e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1f2937' }}
                        >
                            <option value="">Select...</option>
                            {sf.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                    ) : sf.type === 'bool' ? (
                        <input
                            type="checkbox"
                            checked={value[sf.key] === true || value[sf.key] === 'true'}
                            onChange={e => updateCell(sf.key, e.target.checked)}
                            style={{ width: '16px', height: '16px', display: 'block', marginTop: '6px' }}
                        />
                    ) : (
                        <input
                            type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                            value={value[sf.key] ?? ''}
                            onChange={e => updateCell(sf.key, e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
