'use client';
// ─── /dashboard/profile ─────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import ProfileView from '@/components/dashboard/views/ProfileView';

export default function ProfilePage() {
    const { user } = useAuth();
    const { profile, sigUploading, decryptedSigUrl, fetchProfile, handleSigUpload } = useProfile();

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    return (
        <main style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
            <ProfileView user={user} profile={profile} sigUploading={sigUploading} onSigUpload={handleSigUpload} decryptedSigUrl={decryptedSigUrl} />
        </main>
    );
}
