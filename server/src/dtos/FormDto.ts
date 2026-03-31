// ─── Form Data Transfer Objects ──────────────────────────────────────────────
// These typed shapes are used to pass data BETWEEN layers without coupling
// any layer to Prisma models or Express request objects.

export interface CreateFormDto {
    form_type_id: number;
    form_data: Record<string, unknown>;
    userId: number;
}

export interface UpdateFormStatusDto {
    formId: number;
    decision: 'APPROVED' | 'REJECTED';
    remarks?: string;
    approvalData?: Record<string, unknown>;
    userId: number;
}

export interface ForwardFormDto {
    formId: number;
    fromUserId: number;
    toUserId: number;
    note?: string;
}

export interface CreateFormTypeDto {
    name: string;
    description?: string;
    schema_definition?: Record<string, unknown>;
    approval_rules?: Record<string, unknown>;
    is_active?: boolean;
}
