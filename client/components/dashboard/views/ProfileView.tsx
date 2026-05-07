'use client';
// ─── ProfileView ───────────────────────────────────────────────────────────────

import React from 'react';
import { Upload, User, Mail, Briefcase, Building2, Hash, CalendarDays, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Profile } from '@/types';
import ActingRoleSection from '../profile/ActingRoleSection';

interface Props {
    user: any;
    profile: Profile | null;
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
    const primaryRole = profile?.roles?.[0] || null;

    return (
        <div style={{ padding: '32px 40px', maxWidth: '680px', margin: '0 auto' }}>

            {/* ── Header card ─────────────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                borderRadius: '16px', padding: '28px 32px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '24px',
                boxShadow: '0 8px 32px rgba(37,99,235,0.25)',
            }}>
                {/* Avatar */}
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    border: '3px solid rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', fontWeight: 800, color: '#fff', flexShrink: 0,
                    backdropFilter: 'blur(8px)',
                }}>
                    {initials || <User size={28} />}
                </div>

                {/* Name + role pill */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '6px', wordBreak: 'break-word' }}>
                        {displayName}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profile?.roles?.map(role => (
                            <span key={role} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: 'rgba(255,255,255,0.18)', color: '#e0f2fe',
                                fontSize: '11px', fontWeight: 600, padding: '3px 10px',
                                borderRadius: '20px', border: '1px solid rgba(255,255,255,0.25)',
                            }}>
                                <ShieldCheck size={10} /> {role}
                            </span>
                        ))}
                        {(!profile?.roles || profile.roles.length === 0) && (
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>No roles assigned</span>
                        )}
                    </div>
                </div>

                {/* Verified badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#86efac', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                    <BadgeCheck size={18} />
                    Active
                </div>
            </div>

            {/* ── Identity section ────────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', paddingLeft: '2px' }}>
                Identity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <InfoCard icon={<User size={16} />} label="Full Name" value={displayName} accent />
                <InfoCard icon={<Mail size={16} />} label="Email" value={profile?.email || user?.email || '—'} />
                <InfoCard icon={<Hash size={16} />} label="Employee Code" value={profile?.emp_code || '—'} />
                <InfoCard icon={<CalendarDays size={16} />} label="Joining Date" value={profile?.joining_date
                    ? new Date(profile.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'} />
            </div>

            {/* ── Organisation section ─────────────────────────────────────── */}
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', paddingLeft: '2px' }}>
                Organisation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <InfoCard icon={<Building2 size={16} />} label="Department" value={profile?.department || '—'} />
                <InfoCard icon={<Briefcase size={16} />} label="Designation" value={primaryRole || '—'} />
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
                                <BadgeCheck size={14} /> Signature on file
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
