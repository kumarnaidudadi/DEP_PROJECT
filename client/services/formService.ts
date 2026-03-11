// ─── Form Service ──────────────────────────────────────────────────────────────
// Pure API functions for forms and applications.

import api from '@/lib/api';
import { FormType, Application } from '@/types';

export async function getFormTypes(): Promise<FormType[]> {
    const res = await api.get('/forms/types');
    return res.data;
}

export async function getForms(): Promise<Application[]> {
    const res = await api.get('/forms');
    return res.data;
}

export async function createForm(formTypeId: number, formData: Record<string, any>): Promise<Application> {
    const res = await api.post('/forms', { form_type_id: formTypeId, form_data: formData });
    return res.data;
}

export async function updateFormStatus(
    formId: number,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string,
    approvalData: Record<string, any>
): Promise<Application> {
    const res = await api.patch(`/forms/${formId}/status`, { decision, remarks, approvalData });
    return res.data;
}

/** Returns a blob URL for the downloaded PDF. Caller must revoke it after use. */
export async function downloadPdf(formId: number): Promise<string> {
    const response = await api.get(`/forms/${formId}/download`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([response.data]));
}
