// ─── IFormRepository ──────────────────────────────────────────────────────────
// Interface for all form-related database operations.
// Depends on: nothing (pure interface)

import { CreateFormDto } from '../dtos/FormDto';

export interface IFormRepository {
    // Forms (applied_forms)
    findById(id: number): Promise<any | null>;
    findAll(whereClause: object): Promise<any[]>;
    create(dto: CreateFormDto): Promise<any>;
    saveDraft(dto: CreateFormDto, id?: number): Promise<any>;
    delete(id: number): Promise<void>;
    updateStatus(id: number, status: string, extra?: object): Promise<any>;
    updateFormData(id: number, formData: object): Promise<any>;

    // Form Forwards
    createForward(data: object): Promise<any>;
    findForwardsByForm(formId: number): Promise<any[]>;
    findLatestForward(formId: number): Promise<any | null>;

    // Form Types
    findFormTypeById(id: number): Promise<any | null>;
    findAllFormTypes(where?: any): Promise<any[]>;
    createFormType(data: object): Promise<any>;
    updateFormType(id: number, data: object): Promise<any>;
    deleteFormType(id: number): Promise<void>;

    // Office Orders
    findOfficeOrder(formId: number): Promise<any | null>;
    createOfficeOrder(data: object): Promise<any>;

    // Roles
    findRoleByName(name: string): Promise<any | null>;

    // Users
    searchUsers(query: string, limit?: number): Promise<any[]>;
    findUserById(id: number): Promise<any | null>;
    getUserRoles(userId: number): Promise<string[]>;

    // History
    createStatusHistory(data: object): Promise<any>;

    // Transactions
    runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}
