'use client';
// ─── StatusBadge ───────────────────────────────────────────────────────────────

import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props { status: string; lg?: boolean; }

export default function StatusBadge({ status, lg }: Props) {
    const ok = status === 'APPROVED';
    const no = status === 'REJECTED';
    const bg = ok ? '#dcfce7' : no ? '#fee2e2' : '#fef3c7';
    const c = ok ? '#16a34a' : no ? '#dc2626' : '#d97706';
    const Icon = ok ? CheckCircle : no ? XCircle : Clock;
    const label = ok ? 'Approved' : no ? 'Rejected' : status.replace(/_/g, ' ');
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: bg, color: c,
            fontSize: lg ? '12px' : '10px', fontWeight: 600,
            padding: lg ? '4px 12px' : '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap',
        }}>
            <Icon size={lg ? 12 : 10} />{label}
        </span>
    );
}
