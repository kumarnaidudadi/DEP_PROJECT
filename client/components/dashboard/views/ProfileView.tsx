'use client';
// ─── ProfileView ───────────────────────────────────────────────────────────────

import React from 'react';
import { Upload, User, Mail, Briefcase, Building2, Hash, CalendarDays, ShieldCheck, BadgeCheck, Activity, Send, CheckCircle, XCircle } from 'lucide-react';
import { Profile } from '@/types';
import ActingRoleSection from '../profile/ActingRoleSection';

interface Props {
    user: any;
    profile: Profile | any;
    sigUploading: boolean;
    onSigUpload: (file: File) => void;
    decryptedSigUrl?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');
}

function InfoCard({
    icon, label, value, accent = false,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            background: accent ? '#eff6ff' : '#f9fafb',
            border: `1px solid ${accent ? '#bfdbfe' : '#e5e7eb'}`,
            borderRadius: '10px', padding: '14px 16px',
        }}>
            <div style={{
                width: '34px', height: '34px', borderRadius: '8px', flexShrink: 0,
                background: accent ? '#dbeafe' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent ? '#2563eb' : '#6b7280',
            }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                    {label}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word' }}>
                    {value || <span style={{ color: '#d1d5db', fontStyle: 'italic', fontWeight: 400 }}>Not set</span>}
                </div>
            </div>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProfileView({ user, profile, sigUploading, onSigUpload, decryptedSigUrl }: Props) {
    const displayName = profile?.display_name || user?.name || '—';
    const initials = getInitials(displayName);
    const primaryRole = profile?.roles?.[0] || '—';

    // Stats variables
    const stats = profile?.stats || { submitted: 0, forwarded: 0, approved: 0, rejected: 0 };
    
    // Status text color
    const isActive = profile?.is_active ?? true;

    return (
        <div style={{ padding: '32px 40px', width: '100%', margin: '0', background: '#f4f7f9', minHeight: '100vh', boxSizing: 'border-box' }}>

            {/* ── Header card ─────────────────────────────────────────────── */}
            <div style={{
                background: '#ffffff', borderRadius: '12px', padding: '24px 32px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: '#eff6ff', color: '#2563eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', fontWeight: 700, flexShrink: 0
                    }}>
                        {initials || <User size={28} />}
                    </div>

                    {/* Info */}
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937', marginBottom: '6px' }}>
                            {displayName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Mail size={14} /> {profile?.email || user?.email || '—'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Briefcase size={14} /> {primaryRole}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Activity size={14} /> Status: <span style={{ color: isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>{isActive ? 'Active' : 'Inactive'}</span>
                            </span>
                            {profile?.emp_code && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Hash size={14} /> {profile.emp_code}
                                </span>
                            )}
                            {profile?.department && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Building2 size={14} /> {profile.department}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Last Active */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                        LAST ACTIVE
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>
                        {profile?.last_active ? (
                            new Date(profile.last_active).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', hour12: true
                            }).replace(',', ' at').toUpperCase()
                        ) : '—'}
                    </div>
                </div>
            </div>

            {/* ── Stats Row ────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                
                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUBMITTED</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', lineHeight: '1.2' }}>{stats.submitted}</div>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FORWARDED</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', lineHeight: '1.2' }}>{stats.forwarded}</div>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>APPROVED</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', lineHeight: '1.2' }}>{stats.approved}</div>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <XCircle size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REJECTED</div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', lineHeight: '1.2' }}>{stats.rejected}</div>
                    </div>
                </div>

            </div>

            {/* ── Signature section ────────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', paddingLeft: '2px' }}>
                Digital Signature
            </div>
            <div style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
                padding: '20px 24px',
            }}>
                {profile?.signature_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}>
                            <img
                                src={decryptedSigUrl || profile.signature_url}
                                alt="Signature"
                                style={{ maxHeight: '64px', maxWidth: '200px', display: 'block' }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                <BadgeCheck size={14} /> Signature saved
                            </div>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: '7px',
                                fontSize: '12px', color: '#4b5563', fontWeight: 600, cursor: 'pointer',
                                background: '#f9fafb', transition: 'background 0.15s',
                            }}>
                                <Upload size={13} />
                                {sigUploading ? 'Uploading...' : 'Replace'}
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { if (e.target.files?.[0]) onSigUpload(e.target.files[0]); }} />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{
                            width: '120px', height: '56px', background: '#f3f4f6',
                            borderRadius: '8px', border: '2px dashed #d1d5db',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>No signature</span>
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 8px' }}>
                                Upload your signature to attach it to forms automatically.
                            </p>
                            <label style={{
                                display: 'inline-flex', alignItems: 'center', gap: '7px',
                                padding: '9px 18px', border: '2px dashed #3b82f6', borderRadius: '8px',
                                fontSize: '13px', color: '#2563eb', fontWeight: 700, cursor: 'pointer',
                                background: '#eff6ff', transition: 'background 0.15s',
                            }}>
                                <Upload size={15} />
                                {sigUploading ? 'Uploading...' : 'Upload Signature'}
                                <input type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={e => { if (e.target.files?.[0]) onSigUpload(e.target.files[0]); }} />
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Acting Role Section ──────────────────────────────────────── */}
            <ActingRoleSection currentUser={user} />

        </div>
    );
}
