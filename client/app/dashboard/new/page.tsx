'use client';
// ─── /dashboard/new ─────────────────────────────────────────────────────────────
// New Application: form-type list

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, FileText, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useProfile } from '@/hooks/useProfile';
import { FormType } from '@/types';

function FormIcon({ active }: { active: boolean }) {
    const bg = active ? '#dbeafe' : '#f1f5f9';
    const c  = active ? '#2563eb' : '#64748b';
    return (
        <div style={{
            width: 42, height: 42, borderRadius: '10px', flexShrink: 0,
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <FileText size={19} style={{ color: c }} />
        </div>
    );
}

function NewApplicationListContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { formTypes, loading, fetchFormTypes } = useForms();
    const { profile, fetchProfile } = useProfile();

    const [searchQuery, setSearchQuery] = useState('');
    const [adminTab, setAdminTab] = useState<'active' | 'inactive'>('active');
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    useEffect(() => {
        fetchFormTypes();
        fetchProfile();
    }, [fetchFormTypes, fetchProfile]);

    const storedRoles = (user as any)?.roles?.map((r: string) => r.toUpperCase()) || [];
    const liveRoles = profile?.roles?.map(r => r.toUpperCase()) || [];
    const allRoles = [...new Set([...liveRoles, ...storedRoles])];
    const isAdmin = allRoles.includes('ADMIN');

    let list = formTypes;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(ft =>
            ft.name.toLowerCase().includes(q) ||
            ft.description?.toLowerCase().includes(q)
        );
    }

    const activeForms = list.filter(f => f.is_active !== false);
    const inactiveForms = list.filter(f => f.is_active === false);
    
    const formsToShow = isAdmin 
        ? (adminTab === 'active' ? activeForms : inactiveForms)
        : activeForms;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f1f5f9' }}>
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div style={{ padding: '20px 32px 0', background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            New Application
                        </h1>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>
                            {formsToShow.length} available form{formsToShow.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', padding: '8px 14px', width: '210px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        }}>
                            <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search forms..."
                                style={{
                                    border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '13px', color: '#374151', width: '100%',
                                }}
                            />
                        </div>
                    </div>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '-1px' }}>
                        <button
                            onClick={() => setAdminTab('active')}
                            style={{
                                padding: '10px 0',
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: adminTab === 'active' ? 700 : 500,
                                color: adminTab === 'active' ? '#2563eb' : '#6b7280',
                                borderBottom: adminTab === 'active' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                            }}
                        >
                            Active Forms
                        </button>
                        <button
                            onClick={() => setAdminTab('inactive')}
                            style={{
                                padding: '10px 0',
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: adminTab === 'inactive' ? 700 : 500,
                                color: adminTab === 'inactive' ? '#64748b' : '#6b7280',
                                borderBottom: adminTab === 'inactive' ? '2.5px solid #64748b' : '2.5px solid transparent',
                            }}
                        >
                            Inactive Forms
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <button onClick={() => router.push('/dashboard/create')} style={{ position: 'absolute', bottom: '20px', right: '32px', width: '48px', height: '48px', borderRadius: '24px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.5)', border: 'none', cursor: 'pointer', zIndex: 10 }}>
                        <Plus size={24} />
                    </button>
                )}
            </div>

            {/* ── List ───────────────────────────────────────────────────────── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} />
                    </div>
                ) : formsToShow.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px', color: '#94a3b8' }}>
                        <FileText size={44} style={{ opacity: 0.35, marginBottom: '14px' }} />
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>No forms found</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>There are no {isAdmin ? adminTab : 'available'} forms matching your criteria.</p>
                    </div>
                ) : (
                    <div style={{
                        background: '#fff', borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        overflow: 'hidden',
                    }}>
                        {formsToShow.map((ft, idx) => {
                            const isHovered = hoveredId === ft.id;
                            const isLast    = idx === formsToShow.length - 1;
                            return (
                                <div
                                    key={ft.id}
                                    onClick={() => router.push(`/dashboard/new/${ft.id}`)}
                                    onMouseEnter={() => setHoveredId(ft.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        padding: '16px 24px', cursor: 'pointer',
                                        background: isHovered ? '#f8fafc' : '#fff',
                                        borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <FormIcon active={ft.is_active !== false} />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '15px', fontWeight: 600, color: '#0f172a',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            marginBottom: '4px',
                                        }}>
                                            {ft.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '12px' }}>
                                            <span>{ft.description || 'No description available'}</span>
                                        </div>
                                    </div>

                                    {!isAdmin && ft.is_active === false && (
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>Inactive</span>
                                    )}

                                    <ChevronRight
                                        size={16}
                                        style={{
                                            color: '#cbd5e1', flexShrink: 0,
                                            transition: 'transform 0.15s',
                                            transform: isHovered ? 'translateX(3px)' : 'none',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function NewApplicationPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Loader2 size={30} className="animate-spin" /></div>}>
            <NewApplicationListContent />
        </Suspense>
    );
}
