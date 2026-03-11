'use client';
// ─── WelcomeScreen ─────────────────────────────────────────────────────────────

import React from 'react';
import { Building2, FileText, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
    user: any;
    stats: { total: number; ongoing: number; completed: number };
}

export default function WelcomeScreen({ user, stats }: Props) {
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
            <p style={{ fontSize: '13px', color: '#9ca3af', maxWidth: '340px', lineHeight: '1.6', marginBottom: '32px' }}>
                Welcome{user?.name ? `, ${user.name}` : ''}! Select an option from the sidebar to get started.
            </p>

            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{
                    background: '#fff', borderRadius: '12px', padding: '20px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '120px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} style={{ color: '#3b82f6' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>Total</div>
                </div>
                <div style={{
                    background: '#fff', borderRadius: '12px', padding: '20px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '120px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={18} style={{ color: '#f59e0b' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{stats.ongoing}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>Ongoing</div>
                </div>
                <div style={{
                    background: '#fff', borderRadius: '12px', padding: '20px 28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '120px',
                }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{stats.completed}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>Completed</div>
                </div>
            </div>
        </div>
    );
}
