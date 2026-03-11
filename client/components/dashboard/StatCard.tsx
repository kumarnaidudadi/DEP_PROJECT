'use client';
// ─── StatCard ──────────────────────────────────────────────────────────────────

import React from 'react';

interface Props { label: string; value: number; color: string; }

export default function StatCard({ label, value, color }: Props) {
    return (
        <div style={{
            background: '#fff', borderRadius: '10px', padding: '16px', marginBottom: '10px',
            border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color }}>{value}</span>
        </div>
    );
}
