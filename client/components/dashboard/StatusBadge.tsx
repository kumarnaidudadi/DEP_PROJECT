'use client';
// ─── StatusBadge ───────────────────────────────────────────────────────────────

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props { status?: string; action?: string; lg?: boolean; truncate?: boolean; }

export default function StatusBadge({ status, action, lg, truncate }: Props) {
    if (action) {
        let bg = '#f1f5f9';
        let text = '#64748b';
        const a = (action || '').toLowerCase();

        if (a.includes('create') || a.includes('submit')) {
            bg = '#dbeafe'; text = '#2563eb';
        } else if (a.includes('approve') || a.includes('forward')) {
            bg = '#dcfce7'; text = '#16a34a';
        } else if (a.includes('reject')) {
            bg = '#fee2e2'; text = '#dc2626';
        } else if (a.includes('update') || a.includes('edit')) {
            bg = '#fef9c3'; text = '#ca8a04';
        }

        return (
            <span style={{
                background: bg, color: text,
                padding: '4px 10px', borderRadius: '12px',
                fontSize: lg ? '12px' : '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                whiteSpace: 'nowrap'
            }}>
                {action}
            </span>
        );
    }

    const s = status || 'UNKNOWN';
    const ok = s === 'APPROVED' || s === 'ACTIVE';
    const no = s === 'REJECTED' || s === 'INACTIVE';
    const dr = s === 'DRAFT';
    const partial = s === 'PARTIALLY_APPROVED';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : dr ? '#f1f5f9' : partial ? '#fff7ed' : '#fef3c7';
    const c = ok ? '#16a34a' : no ? '#dc2626' : dr ? '#64748b' : partial ? '#ea580c' : '#d97706';
    const Icon = ok ? CheckCircle : no ? XCircle : Clock;
    const label = ok ? (s === 'ACTIVE' ? 'Active' : 'Approved') : 
                  no ? (s === 'INACTIVE' ? 'Inactive' : 'Rejected') : 
                  dr ? 'Draft' : 
                  partial ? 'Partially Approved' : 
                  s.replace(/_/g, ' ');
    return (
        <span
            title={label}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: bg, color: c,
                fontSize: lg ? '12px' : '10px', fontWeight: 600,
                padding: lg ? '4px 12px' : '3px 8px', borderRadius: '10px',
                whiteSpace: truncate ? 'normal' : 'nowrap',
                ...((truncate && false) ? { // removing strict webkit clamping since it's just a span class 
                    maxWidth: '100%',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                } : {}),
            }}
        >
            <Icon size={lg ? 12 : 10} style={{ flexShrink: 0 }} />{label}
        </span>
    );
}
