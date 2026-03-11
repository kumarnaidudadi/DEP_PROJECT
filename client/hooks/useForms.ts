// ─── useForms ──────────────────────────────────────────────────────────────────
// Manages form types, applications state + fetch / submit / decision helpers.

'use client';

import { useState, useCallback } from 'react';
import { FormType, Application } from '@/types';
import * as formSvc from '@/services/formService';

export function useForms() {
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
            const data = await formSvc.getForms();
            setApplications(data);
        } catch (e) {
            console.error('Failed to fetch applications', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const submitForm = useCallback(async (formTypeId: number, formData: Record<string, any>): Promise<Application> => {
        return formSvc.createForm(formTypeId, formData);
    }, []);

    const makeDecision = useCallback(async (
        formId: number,
        decision: 'APPROVED' | 'REJECTED',
        remarks: string,
        approvalData: Record<string, any>
    ): Promise<Application> => {
        return formSvc.updateFormStatus(formId, decision, remarks, approvalData);
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

    return {
        formTypes, setFormTypes,
        applications, setApplications,
        loading,
        fetchFormTypes,
        fetchApplications,
        submitForm,
        makeDecision,
        triggerDownloadPdf,
    };
}
