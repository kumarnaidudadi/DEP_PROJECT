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
    office_orders?: { order_number: string; pdf_url?: string } | null;
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
    emp_code: string | null;
    joining_date: string | null;   // ISO date string "YYYY-MM-DD"
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
    subFields?: {
        key: string;
        label: string;
        type: string;
        required?: boolean;
        options?: string[];
        min?: number;
        max?: number;
    }[];
}

export interface BuilderField {
    name: string;
    type: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    subFields?: { name: string; type: string; options?: string[]; min?: number; max?: number }[];
}

export interface BuilderStep {
    status: string;
    approval_roles: string[];
    fields: BuilderField[];
    showAllRoles?: boolean;
}

// ─── Navigation ────────────────────────────────────────────────────────────────
export type SidebarView = 'dashboard' | 'new' | 'all' | 'pending' | 'create_form' | 'profile';
export type AppTab = 'ongoing' | 'completed' | 'draft';

// ─── Constants ─────────────────────────────────────────────────────────────────
export const FIELD_TYPES = [
    'text', 'number', 'date', 'date_from_to',
    'bool', 'select', 'textarea', 'signature',
    'department', 'role', 'tuple', 'list',
    'name', 'designation', 'employee_code', 'heading', 'paragraph_blanks',
    'date_today'
];

export const FIELD_TYPE_LABELS: Record<string, string> = {
    text: 'Text', number: 'Number', date: 'Date', date_from_to: 'Date Range',
    bool: 'Yes / No', select: 'Select (Options)', textarea: 'Long Text',
    signature: 'Signature', department: 'Department', role: 'Role',
    tuple: 'Group (Tuple)', list: 'Repeating List',
    name: 'Name', designation: 'Designation', employee_code: 'Employee Code',
    heading: 'Section Heading',
    paragraph_blanks: 'Paragraph with Blanks',
    date_today: "Today's Date (Auto-fill)",
};

// ─── Auto-fill ─────────────────────────────────────────────────────────────────
// Single source of truth for field-type → profile-value mappings.
// Returns { data, autoFilledKeys } so the UI can visually mark pre-filled fields.
export function buildAutoFillData(
    fields: FieldDef[],
    profile: Profile | null,
    liveRoles: string[],   // ALL roles assigned to the user
): { data: Record<string, any>; autoFilledKeys: Set<string> } {
    const data: Record<string, any> = {};
    const autoFilledKeys = new Set<string>();

    const fullName = profile
        ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ')
        : '';

    for (const f of fields) {
        switch (f.type) {
            case 'name':
                if (fullName) { data[f.key] = fullName; autoFilledKeys.add(f.key); }
                break;

            case 'designation':
                // Use the user's primary role as their designation
                if (liveRoles.length > 0) { data[f.key] = liveRoles[0]; autoFilledKeys.add(f.key); }
                break;

            case 'employee_code':
                if (profile?.emp_code) { data[f.key] = profile.emp_code; autoFilledKeys.add(f.key); }
                break;

            case 'department':
                if (profile?.department) { data[f.key] = profile.department; autoFilledKeys.add(f.key); }
                break;

            case 'role':
                if (liveRoles.length > 0) { data[f.key] = liveRoles[0]; autoFilledKeys.add(f.key); }
                break;

            case 'date_from_to': {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                data[`${f.key}_from`] = today.toISOString().split('T')[0];
                data[`${f.key}_to`]   = tomorrow.toISOString().split('T')[0];
                autoFilledKeys.add(`${f.key}_from`);
                autoFilledKeys.add(`${f.key}_to`);
                break;
            }

            case 'date_today': {
                const today = new Date().toISOString().split('T')[0];
                data[f.key] = today;
                autoFilledKeys.add(f.key);
                break;
            }

            // 'text', 'number', 'date', 'textarea', 'select', 'bool',
            // 'signature', 'tuple', 'list' — no auto-fill, user fills manually
            default:
                break;
        }
    }

    return { data, autoFilledKeys };
}

// ─── Schema helpers ────────────────────────────────────────────────────────────
export function getSchemaFields(schema: any): FieldDef[] {
    if (schema?.fields && Array.isArray(schema.fields)) return schema.fields;

    if (schema && typeof schema === 'object' && Array.isArray(schema['1'])) {
        const fields: FieldDef[] = [];
        let fieldCounter = 0;
        schema['1'].forEach((item: any) => {
            if (item.name) {
                if (item.type === 'heading') {
                    fields.push({
                        key: `${item.name.replace(/\s+/g, '_')}_heading`,
                        label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                        type: 'heading',
                        required: false,
                    });
                } else {
                    fieldCounter++;
                    fields.push({
                        key: `${item.name.replace(/\s+/g, '_')}_${fieldCounter}`,
                        label: `${fieldCounter}. ${item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
                        type: item.type || 'text',
                        required: item.required === true || item.required === 'true',
                        options: item.options,
                        min: item.min,
                        max: item.max,
                        subFields: Array.isArray(item.subFields)
                            ? item.subFields.map((sf: any, sIdx: number) => ({
                                key: `${sf.name.replace(/\s+/g, '_')}_${sIdx + 1}`,
                                label: `${sIdx + 1}. ${sf.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
                                type: sf.type || 'text',
                                required: sf.required === true || sf.required === 'true',
                                options: sf.options,
                                min: sf.min,
                                max: sf.max,
                            }))
                            : undefined,
                    });
                }
            }
        });
        return fields;
    }

    if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        return [
            { key: 'name', label: '1. Full Name', type: 'text', required: true },
            { key: 'department', label: '2. Department', type: 'department', required: true },
            { key: 'leave_type', label: '3. Leave Type', type: 'select', required: true, options: ['Casual Leave', 'Earned Leave', 'Sick Leave'] },
            { key: 'start_date', label: '4. Start Date', type: 'date', required: true },
            { key: 'end_date', label: '5. End Date', type: 'date', required: true },
            { key: 'reason', label: '6. Reason', type: 'textarea', required: true },
        ];
    }

    return Object.entries(schema).map(([k, v]: [string, any], idx: number) => {
        const baseLabel = v?.label || k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        return {
            key: k,
            label: `${idx + 1}. ${baseLabel}`,
            type: v?.type || 'text',
            required: v?.required ?? false,
            options: v?.options,
            min: v?.min,
            max: v?.max,
        };
    });
}

export function getApprovalFields(schema: any, steps: any[], currentStatus: string): FieldDef[] {
    if (!schema || typeof schema !== 'object') return [];
    const currentStep = steps.find((s: any) => s.step_name === currentStatus);
    if (!currentStep) return [];

    const stepOrder = String(currentStep.step_order);
    const stepConfig = schema[stepOrder];

    if (Array.isArray(stepConfig)) {
        const fields: FieldDef[] = [];
        let fieldCounter = 0;
        stepConfig.forEach((item: any) => {
            if (item.name) {
                if (item.type === 'heading') {
                    fields.push({
                        key: `${item.name.replace(/\s+/g, '_')}_heading`,
                        label: item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                        type: 'heading',
                        required: false,
                    });
                } else {
                    fieldCounter++;
                    fields.push({
                        key: `${item.name.replace(/\s+/g, '_')}_${fieldCounter}`,
                        label: `${fieldCounter}. ${item.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
                        type: item.type || 'text',
                        required: item.required === true || item.required === 'true',
                        options: item.options,
                        min: item.min,
                        max: item.max,
                        subFields: Array.isArray(item.subFields)
                            ? item.subFields.map((sf: any, sIdx: number) => ({
                                key: `${sf.name.replace(/\s+/g, '_')}_${sIdx + 1}`,
                                label: `${sIdx + 1}. ${sf.name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
                                type: sf.type || 'text',
                                required: sf.required === true || sf.required === 'true',
                                options: sf.options,
                                min: sf.min,
                                max: sf.max,
                            }))
                            : undefined,
                    });
                }
            }
        });
        return fields;
    }
    return [];
}
