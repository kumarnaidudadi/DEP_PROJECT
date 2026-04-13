'use client';
// ─── Panel ─────────────────────────────────────────────────────────────────────

import React from 'react';

interface Props {
    title: React.ReactNode;
    children: React.ReactNode;
    style?: React.CSSProperties;
    headerAction?: React.ReactNode;
}

export default function Panel({ title, children, style = {}, headerAction }: Props) {
    return (
        <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb', ...style }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {title}
                </div>
                {headerAction}
            </div>
            {children}
        </div>
    );
}
