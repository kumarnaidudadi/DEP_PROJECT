// ─── Shared TypeScript types for the DEP client ───────────────────────────────
// Single source of truth for all interfaces. Import from '@/types' everywhere.

// ─── Workflow ──────────────────────────────────────────────────────────────────
export interface WorkflowStep {
    id: number;
    step_order: number;
    step_name: string;
    approval_roles: string[];
    is_terminal: boolean;
}

export interface Workflow {
    id: number;
    name: string;
    steps: WorkflowStep[];
}

// ─── Form Types ────────────────────────────────────────────────────────────────
export interface FormType {
    id: number;
    name: string;
    description: string;
    schema_definition: any;
    workflow?: Workflow | null;
    is_active?: boolean;
}

// ─── Application ───────────────────────────────────────────────────────────────
export interface Application {
    id: number;
    form_type_id: number;
    submitted_by: number;
    current_status: string;
    submitted_at: string;
    updated_at: string;
    form_data: any;
    form_types?: FormType;
    users?: { first_name: string; last_name: string; email: string };
    form_approvals?: any[];
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    display_name: string;
    roles: string[];
    department: string | null;
    signature_url: string | null;
}

// ─── Field builder ─────────────────────────────────────────────────────────────
export interface FieldDef {
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    subFields?: { key: string; label: string; type: string }[];
}

export interface BuilderField {
    name: string;
    type: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    subFields?: { name: string; type: string }[];
}

export interface BuilderStep {
    status: string;
    approval_roles: string[];
    fields: BuilderField[];
    showAllRoles?: boolean;
}

// ─── Navigation ────────────────────────────────────────────────────────────────
export type SidebarView = 'dashboard' | 'new' | 'all' | 'pending' | 'create_form' | 'profile';
export type AppTab = 'ongoing' | 'completed';

// ─── Constants ─────────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
    'text', 'number', 'date', 'date_from_to',
    'bool', 'select', 'textarea', 'signature',
    'department', 'role', 'tuple', 'list',
];

export const FIELD_TYPE_LABELS: Record<string, string> = {
    text: 'Text', number: 'Number', date: 'Date', date_from_to: 'Date Range',
    bool: 'Yes / No', select: 'Select (Options)', textarea: 'Long Text',
    signature: 'Signature', department: 'Department', role: 'Role',
    tuple: 'Group (Tuple)', list: 'Repeating List',
};

// ─── Schema helpers ────────────────────────────────────────────────────────────
export function getSchemaFields(schema: any): FieldDef[] {
    if (schema?.fields && Array.isArray(schema.fields)) return schema.fields;

    if (schema && typeof schema === 'object' && Array.isArray(schema['1'])) {
        const fields: FieldDef[] = [];
        schema['1'].forEach((item: any) => {
            if (item.name) {
                fields.push({
                    key: item.name.replace(/\s+/g, '_'),
                    label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    type: item.type || 'text',
                    required: item.required === true || item.required === 'true',
                    options: item.options,
                    min: item.min,
                    max: item.max,
                    subFields: Array.isArray(item.subFields)
                        ? item.subFields.map((sf: any) => ({
                            key: sf.name.replace(/\s+/g, '_'),
                            label: sf.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                            type: sf.type || 'text',
                        }))
                        : undefined,
                });
            }
        });
        return fields;
    }

    if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        return [
            { key: 'name', label: 'Full Name', type: 'text', required: true },
            { key: 'department', label: 'Department', type: 'department', required: true },
            { key: 'leave_type', label: 'Leave Type', type: 'select', required: true, options: ['Casual Leave', 'Earned Leave', 'Sick Leave'] },
            { key: 'start_date', label: 'Start Date', type: 'date', required: true },
            { key: 'end_date', label: 'End Date', type: 'date', required: true },
            { key: 'reason', label: 'Reason', type: 'textarea', required: true },
        ];
    }

    return Object.entries(schema).map(([k, v]: [string, any]) => ({
        key: k,
        label: v?.label || k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        type: v?.type || 'text',
        required: v?.required ?? false,
        options: v?.options,
        min: v?.min,
        max: v?.max,
    }));
}

export function getApprovalFields(schema: any, steps: any[], currentStatus: string): FieldDef[] {
    if (!schema || typeof schema !== 'object') return [];
    const currentStep = steps.find((s: any) => s.step_name === currentStatus);
    if (!currentStep) return [];

    const stepOrder = String(currentStep.step_order);
    const stepConfig = schema[stepOrder];

    if (Array.isArray(stepConfig)) {
        const fields: FieldDef[] = [];
        stepConfig.forEach((item: any) => {
            if (item.name) {
                fields.push({
                    key: item.name.replace(/\s+/g, '_'),
                    label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    type: item.type || 'text',
                    required: item.required === true || item.required === 'true',
                });
            }
        });
        return fields;
    }
    return [];
}
