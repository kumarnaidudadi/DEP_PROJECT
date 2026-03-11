'use client';
// ─── ListItem ──────────────────────────────────────────────────────────────────

import React from 'react';

interface Props {
    children: React.ReactNode;
    sel: boolean;
    onClick: () => void;
}

export default function ListItem({ children, sel, onClick }: Props) {
    return (
        <div onClick={onClick} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', cursor: 'pointer',
            background: sel ? '#eff6ff' : '#fff',
            borderLeft: sel ? '3px solid #2563eb' : '3px solid transparent',
            borderBottom: '1px solid #f3f4f6', transition: 'all 0.1s',
        }}
            onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = '#f9fafb'; }}
            onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
        >
            {children}
        </div>
    );
}
