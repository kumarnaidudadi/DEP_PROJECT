// ─── IFormRepository ─────────────────────────────────────────────────────────
// Interface for the form data access layer. All Prisma/DB operations for the
// forms domain must go through this contract. This decouples Services from
// the concrete database client (Dependency Inversion Principle).

import { CreateFormDto } from '../dtos/FormDto';

export interface IFormRepository {
    // ── Forms ──────────────────────────────────────────────────────────────
    findById(id: number): Promise<any | null>;
    findAll(whereClause: object): Promise<any[]>;
    create(dto: CreateFormDto): Promise<any>;
    saveDraft(dto: CreateFormDto, id?: number): Promise<any>;
    delete(id: number): Promise<void>;
    updateStatus(id: number, status: string, extra?: object): Promise<any>;
    updateFormData(id: number, formData: object): Promise<any>;

    // ── Form Approvals ─────────────────────────────────────────────────────
    findPendingApproval(formId: number): Promise<any | null>;
    createApproval(data: object): Promise<any>;
    updateApproval(id: number, data: object): Promise<any>;

    // ── Form Types ─────────────────────────────────────────────────────────
    findFormTypeById(id: number): Promise<any | null>;
    findAllFormTypes(where?: any): Promise<any[]>;
    createFormType(data: object): Promise<any>;
    updateFormType(id: number, data: object): Promise<any>;
    deleteFormType(id: number): Promise<void>;

    // ── Workflows ──────────────────────────────────────────────────────────
    createWorkflow(data: object): Promise<any>;
    updateWorkflow(id: number, data: object): Promise<any>;
    deleteWorkflowSteps(workflowId: number): Promise<void>;
    createWorkflowStep(data: object): Promise<any>;

    // ── Office Orders ──────────────────────────────────────────────────────
    findOfficeOrder(formId: number): Promise<any | null>;
    createOfficeOrder(data: object): Promise<any>;

    // ── Department Heads & Roles ───────────────────────────────────────────
    findDepartmentHead(filter: object): Promise<any | null>;
    findRoleByName(name: string): Promise<any | null>;
    findUserRole(roleId: number): Promise<any | null>;

    // ── Transactions ───────────────────────────────────────────────────────
    runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}
