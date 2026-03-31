// ─── Form Service ──────────────────────────────────────────────────────────────
// Pure API functions for forms and applications.

import api from '@/lib/api';
import { FormType, Application, UserSearchResult } from '@/types';

export async function getFormTypes(): Promise<FormType[]> {
    const res = await api.get('/forms/types');
    const data = res.data;
    if (Array.isArray(data)) {
        return data.sort((a, b) => a.name.localeCompare(b.name));
    }
    return data;
}

export async function getForms(): Promise<Application[]> {
    const res = await api.get('/forms');
    return res.data;
}

export async function getFormById(id: number): Promise<Application> {
    const res = await api.get(`/forms/${id}`);
    return res.data;
}

export async function createForm(formTypeId: number, formData: Record<string, any>, id?: number): Promise<Application> {
    const res = await api.post('/forms', { form_type_id: formTypeId, form_data: formData, id });
    return res.data;
}

export async function saveDraft(formTypeId: number, formData: Record<string, any>, id?: number): Promise<Application> {
    const res = await api.post('/forms/draft', { form_type_id: formTypeId, form_data: formData, id });
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

/** Forward a form to another user for approval */
export async function forwardForm(
    formId: number,
    toUserId: number,
    note?: string
): Promise<Application> {
    const res = await api.post(`/forms/${formId}/forward`, { toUserId, note });
    return res.data;
}

/** Search users by name/email for the forwarding typeahead */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
    const res = await api.get('/forms/users/search', { params: { q: query } });
    return res.data;
}

/** Get forwarding and approval history for a form */
export async function getFormHistory(formId: number): Promise<any> {
    const res = await api.get(`/forms/${formId}/history`);
    return res.data;
}

/** Returns a blob URL for the downloaded PDF. Caller must revoke it after use. */
export async function downloadPdf(formId: number): Promise<string> {
    const response = await api.get(`/forms/${formId}/download`, { responseType: 'blob' });
    return window.URL.createObjectURL(new Blob([response.data]));
}

export async function deleteForm(formId: number): Promise<void> {
    await api.delete(`/forms/${formId}`);
}
