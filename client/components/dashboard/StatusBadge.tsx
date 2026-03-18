'use client';
// ─── StatusBadge ───────────────────────────────────────────────────────────────

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props { status: string; lg?: boolean; truncate?: boolean; }

export default function StatusBadge({ status, lg, truncate }: Props) {
    const ok = status === 'APPROVED';
    const no = status === 'REJECTED';
    const dr = status === 'DRAFT';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : dr ? '#f1f5f9' : '#fef3c7';
    const c = ok ? '#16a34a' : no ? '#dc2626' : dr ? '#64748b' : '#d97706';
    const Icon = ok ? CheckCircle : no ? XCircle : dr ? Clock : Clock;
    const label = ok ? 'Approved' : no ? 'Rejected' : dr ? 'Draft' : status.replace(/_/g, ' ');
    return (
        <span
            title={label}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: bg, color: c,
                fontSize: lg ? '12px' : '10px', fontWeight: 600,
                padding: lg ? '4px 12px' : '3px 8px', borderRadius: '10px',
                whiteSpace: truncate ? 'normal' : 'nowrap',
                ...(truncate ? {
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
