// ─── Shared TypeScript types for the DEP client ───────────────────────────────
// Single source of truth for all interfaces. Import from '@/types' everywhere.

// ─── Form Types ────────────────────────────────────────────────────────────────
export interface FormType {
    id: number;
    name: string;
    description: string;
    schema_definition: any;
    approval_rules?: { required_roles?: string[], first_routing_role?: string | null } | null;
    is_active?: boolean;
    ref_prefix?: string | null;
}

// ─── Form Forward ──────────────────────────────────────────────────────────────
export interface FormForward {
    id: number;
    form_id: number;
    forwarded_by: number;
    forwarded_to: number;
    note?: string;
    action?: string;
    remarks?: string;
    forwarded_at: string;
    from_user?: { id: number; name: string;  email: string };
    to_user?: { id: number; name: string;  email: string };
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
    reference_number?: string | null;
    form_types?: FormType;
    users?: { id?: number; name: string;  email: string };
    form_approvals?: any[];
    form_forwards?: FormForward[];
    office_orders?: { order_number: string; pdf_url?: string } | null;
    form_status_history?: any[];
}

export function getApplicationStatus(app: Partial<Application> & { status?: string | null }) {
    return String(app.current_status ?? app.status ?? '').toUpperCase();
}

export function getApplicationSubmitterId(app: Partial<Application> & { applicant_id?: number | string | bigint | null }) {
    return Number(app.submitted_by ?? app.applicant_id ?? 0);
}

export function getLatestForward(app: Partial<Application>) {
    const forwards = Array.isArray(app.form_forwards) ? app.form_forwards : [];
    if (forwards.length === 0) return null;

    return [...forwards].sort((a, b) =>
        new Date(b.forwarded_at).getTime() - new Date(a.forwarded_at).getTime()
    )[0] || null;
}

// ─── User Search Result ────────────────────────────────────────────────────────
export interface UserSearchResult {
    id: number;
    name: string;
    
    
    email: string;
    department?: string | null;
    roles: string[];
}

// ─── Profile ───────────────────────────────────────────────────────────────────
export interface Profile {
    id: number;
    name: string;
    
    
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
    helpText?: string;
    conditionalLogic?: FieldCondition | null;
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

export interface FieldCondition {
    dependsOn: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'not_empty';
    value?: string;
}

export interface BuilderField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options?: string[];
    min?: number;
    max?: number;
    helpText?: string;
    conditionalLogic?: FieldCondition | null;
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

export interface FieldTypeOption {
    category: 'recent' | 'basic' | 'dates' | 'profile' | 'structural';
    type: string;
    label: string;
    description: string;
}

export const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
    { category: 'basic', type: 'text', label: 'Text (Short)', description: 'One-line input for short answers.' },
    { category: 'basic', type: 'textarea', label: 'Text (Long)', description: 'Multi-line text for detailed responses.' },
    { category: 'basic', type: 'number', label: 'Number', description: 'Numeric input with optional min and max values.' },
    { category: 'basic', type: 'select', label: 'Dropdown', description: 'Pick one option from a configurable list.' },
    { category: 'basic', type: 'bool', label: 'Yes/No Toggle', description: 'Binary choice for simple confirmations.' },
    { category: 'dates', type: 'date', label: 'Single Date', description: 'Choose one calendar date.' },
    { category: 'dates', type: 'date_from_to', label: 'Date Range', description: 'Capture a from and to date together.' },
    { category: 'dates', type: 'date_today', label: "Today's Date (Auto-fill)", description: 'Auto-fills with the current date, read-only for applicants.' },
    { category: 'profile', type: 'name', label: 'Full Name', description: 'Auto-fill the applicant full name.' },
    { category: 'profile', type: 'designation', label: 'Designation', description: 'Auto-fill the current designation or title.' },
    { category: 'profile', type: 'employee_code', label: 'Employee Code', description: 'Auto-fill the employee or staff code.' },
    { category: 'profile', type: 'department', label: 'Department', description: 'Department selector using known departments.' },
    { category: 'profile', type: 'role', label: 'System Role', description: 'Auto-fill or select a system role.' },
    { category: 'profile', type: 'signature', label: 'Signature', description: 'Attach a saved signature or upload one.' },
    { category: 'structural', type: 'heading', label: 'Section Heading', description: 'Break the form into clearly named sections.' },
    { category: 'structural', type: 'paragraph_blanks', label: 'Paragraph with Blanks', description: 'Inline sentence template with fillable blanks.' },
    { category: 'structural', type: 'tuple', label: 'Data Group (Tuple)', description: 'Collect related fields in one compact group.' },
    { category: 'structural', type: 'list', label: 'Repeating List', description: 'Repeat a row of fields for multiple entries.' },
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

export function createBuilderFieldId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createBuilderField(type = 'text'): BuilderField {
    return {
        id: createBuilderFieldId(),
        name: '',
        type,
        required: type !== 'heading',
        options: type === 'select'
            ? ['Option 1', 'Option 2']
            : type === 'paragraph_blanks'
                ? ['I confirm that [____].']
                : undefined,
        subFields: type === 'tuple' || type === 'list'
            ? [{ name: '', type: 'text' }]
            : undefined,
    };
}

export function suggestFieldTypeFromName(fieldName: string): string | null {
    const normalized = fieldName.trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes('signature')) return 'signature';
    if (normalized.includes('department')) return 'department';
    if (normalized.includes('designation') || normalized.includes('title')) return 'designation';
    if (normalized.includes('employee code') || normalized.includes('emp code') || normalized.includes('employee id') || normalized.includes('staff id')) {
        return 'employee_code';
    }
    if (normalized.includes('role')) return 'role';
    if (normalized.includes('date range') || normalized.includes('duration') || normalized.includes('period') || (normalized.includes('from') && normalized.includes('to'))) {
        return 'date_from_to';
    }
    if (normalized.includes('date') || normalized.includes('dob') || normalized.includes('birthday')) return 'date';
    if (normalized.includes('full name') || normalized === 'name' || normalized.endsWith(' name')) return 'name';
    if (normalized.includes('description') || normalized.includes('reason') || normalized.includes('comment') || normalized.includes('details') || normalized.includes('address')) {
        return 'textarea';
    }
    if (normalized.includes('amount') || normalized.includes('count') || normalized.includes('number') || normalized.includes('quantity')) {
        return 'number';
    }
    if (normalized.includes('yes') || normalized.includes('consent') || normalized.includes('confirm') || normalized.includes('agree')) {
        return 'bool';
    }
    if (normalized.includes('type') || normalized.includes('category') || normalized.includes('option')) return 'select';
    if (normalized.includes('section') || normalized.includes('heading')) return 'heading';
    if (normalized.includes('list') || normalized.includes('items')) return 'list';
    if (normalized.includes('group') || normalized.includes('tuple')) return 'tuple';

    return null;
}

export function formatTitleCase(name: string) {
    if (!name) return '';
    return name.replace(/_/g, ' ')
        .replace(/\b\w/g, (char: string) => char.toUpperCase())
        .replace(/\(S\)/g, '(s)');
}

function formatFieldName(name: string) {
    return formatTitleCase(name);
}

function normalizeArrayFields(rawFields: any[]): FieldDef[] {
    if (!Array.isArray(rawFields)) return [];

    const fields: FieldDef[] = [];
    let fieldCounter = 0;

    rawFields.forEach((item: any) => {
        if (!item?.name) return;

        if (item.type === 'heading') {
            fields.push({
                key: item.key || item.id || `${item.name.replace(/\s+/g, '_')}_heading`,
                label: item.label || formatFieldName(item.name),
                type: 'heading',
                required: false,
                helpText: item.helpText,
                conditionalLogic: item.conditionalLogic || null,
            });
            return;
        }

        fieldCounter += 1;
        fields.push({
            key: item.key || item.id || `${item.name.replace(/\s+/g, '_')}_${fieldCounter}`,
            label: item.label || `${fieldCounter}. ${formatFieldName(item.name)}`,
            type: item.type || 'text',
            required: item.required === true || item.required === 'true',
            options: item.options,
            min: item.min,
            max: item.max,
            helpText: item.helpText,
            conditionalLogic: item.conditionalLogic || null,
            subFields: Array.isArray(item.subFields)
                ? item.subFields.map((sf: any, sIdx: number) => ({
                    key: sf.key || sf.id || `${sf.name.replace(/\s+/g, '_')}_${sIdx + 1}`,
                    label: sf.label || `${sIdx + 1}. ${formatFieldName(sf.name)}`,
                    type: sf.type || 'text',
                    required: sf.required === true || sf.required === 'true',
                    options: sf.options,
                    min: sf.min,
                    max: sf.max,
                }))
                : undefined,
        });
    });

    return fields;
}

function parseStepFields(stepConfig: any): FieldDef[] {
    return normalizeArrayFields(stepConfig);
}

function normalizeVisibilityValue(value: any): string {
    if (Array.isArray(value)) return value.join(' ').toLowerCase();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}

export function isFieldVisible(field: Pick<FieldDef, 'conditionalLogic'>, formData: Record<string, any>) {
    const rule = field.conditionalLogic;
    if (!rule?.dependsOn) return true;

    const currentValue = normalizeVisibilityValue(formData[rule.dependsOn]);
    const expectedValue = normalizeVisibilityValue(rule.value);

    switch (rule.operator) {
        case 'equals':
            return currentValue === expectedValue;
        case 'not_equals':
            return currentValue !== expectedValue;
        case 'contains':
            return currentValue.includes(expectedValue);
        case 'is_empty':
            return currentValue.length === 0;
        case 'not_empty':
            return currentValue.length > 0;
        default:
            return true;
    }
}

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
        ? profile.name
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
                data[`${f.key}_to`] = tomorrow.toISOString().split('T')[0];
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
    if (schema?.data && Array.isArray(schema.data)) return normalizeArrayFields(schema.data);
    if (schema?.fields && Array.isArray(schema.fields)) return normalizeArrayFields(schema.fields);

    if (schema && typeof schema === 'object' && Array.isArray(schema['1'])) {
        return parseStepFields(schema['1']);
    }

    if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        return [];
    }

    return Object.entries(schema).map(([k, v]: [string, any], idx: number) => {
        const baseLabel = v?.label || formatTitleCase(k);
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

/** Get fields for a specific schema step key */
export function getApprovalFields(schema: any, steps: any[], currentStatus: string): FieldDef[] {
    if (!schema || typeof schema !== 'object') return [];

    // Builder-style schemas store applicant fields in `data` / `fields`.
    // These should not be treated as approval-stage fields.
    if (Array.isArray(schema.data) || Array.isArray(schema.fields)) return [];
    
    // In the new system without workflow steps, look for step configs in schema numerically
    // Try to find fields for the current status or the next step
    const keys = Object.keys(schema).sort((a, b) => Number(a) - Number(b));
    
    // If steps exist (from old snapshots), try to match by step_name  
    if (steps && steps.length > 0) {
        const currentStep = steps.find((s: any) => s.step_name === currentStatus);
        if (currentStep) {
            const stepOrder = String(currentStep.step_order);
            const stepConfig = schema[stepOrder];
            return parseStepFields(stepConfig);
        }
    }
    
    // For the new dynamic system, look for schema keys beyond '1' (applicant step)
    for (const key of keys) {
        if (key === '1') continue; // Skip applicant step
        const stepConfig = schema[key];
        if (Array.isArray(stepConfig) && stepConfig.length > 1) {
            return parseStepFields(stepConfig);
        }
    }
    
    return [];
}
