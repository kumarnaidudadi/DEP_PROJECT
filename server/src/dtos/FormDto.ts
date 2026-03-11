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

export interface CreateFormTypeDto {
    name: string;
    description?: string;
    schema_definition?: Record<string, unknown>;
    workflow_name?: string;
    workflow_steps?: WorkflowStepDto[];
    is_active?: boolean;
}

export interface WorkflowStepDto {
    step_name: string;
    approval_roles?: string[];
    is_terminal?: boolean;
}
