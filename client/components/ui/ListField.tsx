'use client';
// ─── ListField ─────────────────────────────────────────────────────────────────
// Repeating-row table input for 'list' type schema fields.

import React from 'react';
import { Trash2, Plus } from 'lucide-react';

interface SubField {
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
}

interface ListFieldProps {
    fieldKey: string;
    subFields: SubField[];
    value: Record<string, any>[];
    onChange: (val: Record<string, any>[]) => void;
}

export default function ListField({ subFields, value, onChange }: ListFieldProps) {
    const addRow = () => onChange([...value, {}]);
    const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const updateCell = (rowIdx: number, colKey: string, val: any) =>
        onChange(value.map((row, i) => i === rowIdx ? { ...row, [colKey]: val } : row));

    if (subFields.length === 0) return (
        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
            No sub-fields defined. Configure them in the Form Builder.
        </div>
    );

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                    <tr style={{ background: '#f9fafb' }}>
                        {subFields.map(sf => (
                            <th key={sf.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                                {sf.label}
                            </th>
                        ))}
                        <th style={{ width: '36px', borderBottom: '1px solid #e5e7eb' }} />
                    </tr>
                </thead>
                <tbody>
                    {value.length === 0 && (
                        <tr><td colSpan={subFields.length + 1} style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>No entries yet. Click &quot;Add Row&quot; below.</td></tr>
                    )}
                    {value.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            {subFields.map(sf => (
                                <td key={sf.key} style={{ padding: '5px 6px' }}>
                                    {sf.type === 'date_from_to' ? (
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <input
                                                type="date"
                                                value={row[`${sf.key}_from`] ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const toVal = row[`${sf.key}_to`];
                                                    if (toVal && val > toVal) {
                                                        alert('From Date cannot be later than To Date');
                                                    } else {
                                                        updateCell(rowIdx, `${sf.key}_from`, val);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                                            />
                                            <span style={{ display: 'flex', alignItems: 'center', color: '#6b7280', fontSize: '11px' }}>to</span>
                                            <input
                                                type="date"
                                                value={row[`${sf.key}_to`] ?? ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const fromVal = row[`${sf.key}_from`];
                                                    if (fromVal && val < fromVal) {
                                                        alert('To Date cannot be earlier than From Date');
                                                    } else {
                                                        updateCell(rowIdx, `${sf.key}_to`, val);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                                            />
                                        </div>
                                    ) : sf.type === 'select' ? (
                                        <select
                                            value={row[sf.key] ?? ''}
                                            onChange={e => updateCell(rowIdx, sf.key, e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#1f2937' }}
                                        >
                                            <option value="">Select...</option>
                                            {sf.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : sf.type === 'bool' ? (
                                        <input
                                            type="checkbox"
                                            checked={row[sf.key] === true || row[sf.key] === 'true'}
                                            onChange={e => updateCell(rowIdx, sf.key, e.target.checked)}
                                            style={{ width: '16px', height: '16px', margin: '0 auto', display: 'block' }}
                                        />
                                    ) : (
                                        <input
                                            type={sf.type === 'number' ? 'number' : sf.type === 'date' ? 'date' : 'text'}
                                            value={row[sf.key] ?? ''}
                                            onChange={e => updateCell(rowIdx, sf.key, e.target.value)}
                                            style={{ width: '100%', padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none', boxSizing: 'border-box', color: '#1f2937', background: '#fff' }}
                                        />
                                    )}
                                </td>
                            ))}
                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                <button type="button" onClick={() => removeRow(rowIdx)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button type="button" onClick={addRow}
                style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={12} /> Add Row
            </button>
        </div>
    );
}
