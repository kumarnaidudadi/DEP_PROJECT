// ─── Form Service ──────────────────────────────────────────────────────────────
// Pure API functions for forms and applications.

import api from '@/lib/api';
import { FormType, Application, UserSearchResult } from '@/types';

/** Compose a display name from whatever shape the API returns */
function composeName(user: any): string {
    if (!user) return '';
    if (user.name) return user.name;
    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.join(' ') || user.email || '';
}

/** Normalize a user object to always have a .name field */
function normalizeUser(user: any): any {
    if (!user) return user;
    return { ...user, name: composeName(user) };
}

function normalizeApplication(item: any): Application {
    return {
        ...item,
        current_status: (item.current_status ?? item.status ?? '').toUpperCase(),
        submitted_by: Number(item.submitted_by ?? item.applicant_id ?? 0),
        // Normalize the applicant user object
        users: normalizeUser(item.users),
        // Normalize from_user and to_user inside each form_forward
        form_forwards: Array.isArray(item.form_forwards)
            ? item.form_forwards.map((fwd: any) => ({
                ...fwd,
                from_user: normalizeUser(fwd.from_user),
                to_user: normalizeUser(fwd.to_user),
            }))
            : item.form_forwards,
        // Normalize approver user objects inside form_approvals
        form_approvals: Array.isArray(item.form_approvals)
            ? item.form_approvals.map((appr: any) => ({
                ...appr,
                users: normalizeUser(appr.users),
            }))
            : item.form_approvals,
    };
}

export async function getFormTypes(): Promise<FormType[]> {
    const res = await api.get('/forms/types');
    const data = res.data;
    if (Array.isArray(data)) {
        return data
            .map((item: any) => ({
                ...item,
                schema_definition: item.schema_definition ?? item.schema ?? {},
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    return data;
}

export async function getForms(actingForUserId?: number): Promise<Application[]> {
    const res = await api.get('/forms', { params: { actingForUserId } });
    return Array.isArray(res.data) ? res.data.map(normalizeApplication) : res.data;
}

export async function getFormById(id: number): Promise<Application> {
    const res = await api.get(`/forms/${id}`);
    return normalizeApplication(res.data);
}

export async function createForm(
    formTypeId: number,
    formData: Record<string, any>,
    id?: number,
    toUserId?: number,
    note?: string
): Promise<Application> {
    const res = await api.post('/forms', {
        form_type_id: formTypeId,
        form_data: formData,
        id,
        toUserId,
        note
    });
    return normalizeApplication(res.data);
}

export async function saveDraft(formTypeId: number, formData: Record<string, any>, id?: number): Promise<Application> {
    const res = await api.post('/forms/draft', { form_type_id: formTypeId, form_data: formData, id });
    return normalizeApplication(res.data);
}

export async function updateFormStatus(
    formId: number,
    decision: 'APPROVED' | 'REJECTED',
    remarks: string,
    approvalData: Record<string, any>,
    actingForUserId?: number
): Promise<Application> {
    const res = await api.patch(`/forms/${formId}/status`, { decision, remarks, approvalData, actingForUserId });
    return normalizeApplication(res.data);
}

/** Forward a form to another user for approval */
export async function forwardForm(
    formId: number,
    toUserId: number,
    note?: string,
    actingForUserId?: number
): Promise<Application> {
    const res = await api.post(`/forms/${formId}/forward`, { toUserId, note, actingForUserId });
    return normalizeApplication(res.data);
}

/** Search users by name/email for the forwarding typeahead */
export async function searchUsers(query: string, formId?: number): Promise<UserSearchResult[]> {
    const res = await api.get('/forms/users/search', { params: { q: query, formId } });
    return res.data;
}

/** Get the first routing target user for a specific role based on applicant's context */
export async function getRoutingTarget(roleName: string): Promise<UserSearchResult | null> {
    try {
        const res = await api.get(`/forms/routing-target/${roleName}`);
        return res.data;
    } catch {
        return null;
    }
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

export async function withdrawForm(formId: number): Promise<Application> {
    const res = await api.post(`/forms/${formId}/withdraw`);
    return normalizeApplication(res.data);
}
