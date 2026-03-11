'use client';
// ─── ProfileView ───────────────────────────────────────────────────────────────

import React from 'react';
import { Upload } from 'lucide-react';
import { Profile } from '@/types';
import Panel from '../Panel';

interface Props {
    user: any;
    profile: Profile | null;
    sigUploading: boolean;
    onSigUpload: (file: File) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
            <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{value}</div>
        </div>
    );
}

export default function ProfileView({ user, profile, sigUploading, onSigUpload }: Props) {
    return (
        <div style={{ padding: '32px 40px', maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: '0 0 24px' }}>Profile</h1>

            <Panel title="Personal Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <InfoRow label="Display Name" value={profile?.display_name || user?.name || '—'} />
                    <InfoRow label="Email" value={profile?.email || user?.email || '—'} />
                    <InfoRow label="Role" value={profile?.roles?.join(', ') || '—'} />
                    <InfoRow label="Department" value={profile?.department || '—'} />
                </div>
            </Panel>

            <Panel title="Digital Signature">
                {profile?.signature_url ? (
                    <div style={{ marginBottom: '16px' }}>
                        <img
                            src={`http://localhost:4000${profile.signature_url}`}
                            alt="Signature"
                            style={{ maxHeight: '80px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px', background: '#fff' }}
                        />
                    </div>
                ) : (
                    <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>No signature uploaded yet.</p>
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: '2px dashed #d1d5db', borderRadius: '8px', fontSize: '13px', color: '#2563eb', fontWeight: 600, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <Upload size={16} />
                    {sigUploading ? 'Uploading...' : 'Upload Signature'}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) onSigUpload(e.target.files[0]); }} />
                </label>
            </Panel>
        </div>
    );
}
