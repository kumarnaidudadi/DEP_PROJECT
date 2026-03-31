// ─── Form Type Service ─────────────────────────────────────────────────────────
// Admin-only API functions for managing form type definitions.

import api from '@/lib/api';
import { FormType } from '@/types';

export interface FormTypePayload {
    name: string;
    description: string;
    schema: Record<string, any>;
    approval_rules?: { required_roles: string[] };
}

export async function createFormType(payload: FormTypePayload): Promise<FormType> {
    const res = await api.post('/forms/types', payload);
    return res.data;
}

export async function updateFormType(id: number, payload: FormTypePayload): Promise<FormType> {
    const res = await api.put(`/forms/types/${id}`, payload);
    return res.data;
}

export async function deleteFormType(id: number): Promise<void> {
    await api.delete(`/forms/types/${id}`);
}
