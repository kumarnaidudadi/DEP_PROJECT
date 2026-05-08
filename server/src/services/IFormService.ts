// ─── IFormService ─────────────────────────────────────────────────────────────
// Interface for all form/application business logic.

import { CreateFormDto, UpdateFormStatusDto, CreateFormTypeDto, ForwardFormDto } from '../dtos/FormDto';

export interface IFormService {
    // Form Types
    getFormTypes(roles?: string[]): Promise<any[]>;
    createFormType(dto: CreateFormTypeDto): Promise<any>;
    updateFormType(id: number, dto: CreateFormTypeDto): Promise<any>;
    deleteFormType(id: number, roles: string[]): Promise<void>;

    // Forms
    getForms(userId: number, roles: string[]): Promise<any[]>;
    getFormById(id: number): Promise<any>;
    createForm(dto: CreateFormDto, id?: number): Promise<any>;
    saveDraft(dto: CreateFormDto, id?: number): Promise<any>;
    deleteForm(id: number, roles: string[], userId?: number): Promise<void>;
    withdrawForm(id: number, userId: number): Promise<any>;

    // Dynamic Forwarding
    forwardForm(dto: ForwardFormDto): Promise<any>;
    updateFormStatus(dto: UpdateFormStatusDto): Promise<any>;

    searchUsers(query: string, formId?: number): Promise<any[]>;
    getRoutingTarget(roleName: string, applicantId: number): Promise<any>;

    // History
    getFormHistory(formId: number): Promise<any>;
    getSystemLogs(roles: string[]): Promise<any>;
}
