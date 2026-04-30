// ─── useForms ──────────────────────────────────────────────────────────────────
// Manages form types, applications state + fetch / submit / decision / forward helpers.

'use client';

import { useState, useCallback } from 'react';
import { FormType, Application, UserSearchResult } from '@/types';
import * as formSvc from '@/services/formService';

export function useForms(actingForUserId?: number) {
    const [formTypes, setFormTypes] = useState<FormType[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchFormTypes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await formSvc.getFormTypes();
            setFormTypes(data);
        } catch (e) {
            console.error('Failed to fetch form types', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchApplications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await formSvc.getForms(actingForUserId);
            setApplications(data);
        } catch (e) {
            console.error('Failed to fetch applications', e);
        } finally {
            setLoading(false);
        }
    }, [actingForUserId]);

    const submitForm = useCallback(async (
        formTypeId: number,
        formData: Record<string, any>,
        id?: number,
        toUserId?: number,
        note?: string
    ): Promise<Application> => {
        const result = await formSvc.createForm(formTypeId, formData, id, toUserId, note);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('applications-updated'));
        }
        return result;
    }, []);

    const saveDraft = useCallback(async (formTypeId: number, formData: Record<string, any>, id?: number): Promise<Application> => {
        const result = await formSvc.saveDraft(formTypeId, formData, id);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('applications-updated'));
        }
        return result;
    }, []);

    const makeDecision = useCallback(async (
        formId: number,
        decision: 'APPROVED' | 'REJECTED',
        remarks: string,
        approvalData: Record<string, any>
    ): Promise<Application> => {
        const result = await formSvc.updateFormStatus(formId, decision, remarks, approvalData, actingForUserId);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('applications-updated'));
        }
        return result;
    }, [actingForUserId]);

    const forwardForm = useCallback(async (
        formId: number,
        toUserId: number,
        note?: string
    ): Promise<Application> => {
        const result = await formSvc.forwardForm(formId, toUserId, note, actingForUserId);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('applications-updated'));
        }
        return result;
    }, [actingForUserId]);

    const searchUsers = useCallback(async (query: string, formId?: number): Promise<UserSearchResult[]> => {
        return formSvc.searchUsers(query, formId);
    }, []);

    const triggerDownloadPdf = useCallback(async (formId: number, fileName: string) => {
        const url = await formSvc.downloadPdf(formId);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }, []);

    const deleteApplication = useCallback(async (formId: number) => {
        await formSvc.deleteForm(formId);
        setApplications(prev => prev.filter(app => app.id !== formId));
    }, []);

    return {
        formTypes, setFormTypes,
        applications, setApplications,
        loading,
        fetchFormTypes,
        fetchApplications,
        submitForm,
        saveDraft,
        makeDecision,
        forwardForm,
        searchUsers,
        triggerDownloadPdf,
        deleteApplication,
    };
}
