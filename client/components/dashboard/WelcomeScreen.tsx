'use client';
// ─── WelcomeScreen ─────────────────────────────────────────────────────────────

import React from 'react';
import { Building2 } from 'lucide-react';

interface Props {
    user: any;
    stats: { total: number; ongoing: number; completed: number };
}

export default function WelcomeScreen({ user }: Props) {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
            <div style={{
                width: '88px', height: '88px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#0f172a,#2563eb)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px', boxShadow: '0 8px 32px rgba(37,99,235,0.2)',
            }}>
                <Building2 size={40} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>IIT ROPAR</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280', margin: '0 0 20px' }}>Leave Forms &amp; Application Portal</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '340px', lineHeight: '1.6' }}>
                Welcome{user?.name ? `, ${user.name}` : ''}! Select an option from the sidebar to get started.
            </p>
        </div>
    );
}
