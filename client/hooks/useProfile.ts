// ─── useProfile ────────────────────────────────────────────────────────────────
// Manages profile, roles, departments state + fetch / upload helpers.

'use client';

import { useState, useCallback } from 'react';
import { Profile } from '@/types';
import * as profileSvc from '@/services/profileService';

export function useProfile() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [availableDepartments, setAvailableDepartments] = useState<any[]>([]);
    const [sigUploading, setSigUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [decryptedSigUrl, setDecryptedSigUrl] = useState<string | null>(null);

    const fetchDecryptedSig = useCallback(async () => {
        try {
            const url = await profileSvc.getDecryptedSignatureUrl();
            setDecryptedSigUrl(url);
        } catch {
            setDecryptedSigUrl(null);
        }
    }, []);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await profileSvc.getProfile();
            setProfile(data);
            // If user has a signature, fetch the decrypted image
            if (data.signature_url) fetchDecryptedSig();
        } catch (e) {
            console.error('Failed to fetch profile', e);
        } finally {
            setLoading(false);
        }
    }, [fetchDecryptedSig]);

    const fetchRoles = useCallback(async () => {
        try {
            const roles = await profileSvc.getRoles();
            setAvailableRoles(roles);
        } catch (e) {
            console.error('Failed to fetch roles', e);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const depts = await profileSvc.getDepartments();
            setAvailableDepartments(depts);
        } catch (e) {
            console.error('Failed to fetch departments', e);
        }
    }, []);

    const handleSigUpload = useCallback(async (file: File) => {
        setSigUploading(true);
        try {
            const url = await profileSvc.uploadSignature(file);
            setProfile(prev => prev ? { ...prev, signature_url: url } : prev);
            // Refresh decrypted image after upload
            fetchDecryptedSig();
        } catch (e: any) {
            const msg = e.response?.data?.error || e.message || 'Failed to upload';
            alert(`Upload failed: ${msg}. Max 5MB, JPG/PNG only.`);
        } finally {
            setSigUploading(false);
        }
    }, [fetchDecryptedSig]);

    return {
        profile, setProfile,
        availableRoles,
        availableDepartments,
        sigUploading,
        loading,
        decryptedSigUrl,
        fetchProfile,
        fetchRoles,
        fetchDepartments,
        handleSigUpload,
    };
}
