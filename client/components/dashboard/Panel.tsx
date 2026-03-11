'use client';
// ─── Panel ─────────────────────────────────────────────────────────────────────

import React from 'react';

interface Props {
    title: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export default function Panel({ title, children, style = {} }: Props) {
    return (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb', ...style }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {title}
            </div>
            {children}
        </div>
    );
}
