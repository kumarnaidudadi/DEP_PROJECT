export interface PdfFieldMapping {
    getter: (form: any, getFd: (keySub: string) => any) => string;
    x: number;
    y: number;
    size?: number;
}

export interface PdfSignatureMapping {
    stage: string | string[]; // 'applicant' is special, others match form_approvals
    x: number;
    y: number;
}

export interface PdfMappingConfig {
    fields: PdfFieldMapping[];
    signatures: PdfSignatureMapping[];
}

export const airIndiaMapping: PdfMappingConfig = {
    fields: [
        { getter: (form, getFd) => form.form_data?.Name || form.users?.first_name || '', x: 310, y: 172 },
        { getter: (form, getFd) => getFd('Designation'), x: 310, y: 198 },
        { getter: (form, getFd) => getFd('Department'), x: 310, y: 218 },
        { getter: (form, getFd) => getFd('from'), x: 320, y: 262, size: 10 },
        { getter: (form, getFd) => getFd('to'), x: 435, y: 262, size: 10 },
        { getter: (form, getFd) => getFd('place'), x: 310, y: 287 },
        { getter: (form, getFd) => getFd('purpose'), x: 310, y: 309 },
        { getter: (form, getFd) => String(getFd('sectors')).substring(0, 50), x: 310, y: 338 },
        { getter: (form, getFd) => String(getFd('reason_for_travel')).substring(0, 50), x: 310, y: 392 },
        { getter: (form, getFd) => {
            const mhrdObj = getFd('mhrd');
            return typeof mhrdObj === 'boolean' ? (mhrdObj ? 'Yes' : 'No') : String(mhrdObj || '');
        }, x: 435, y: 432 },
        { getter: (form, getFd) => String(getFd('budget')).substring(0, 50), x: 310, y: 475 },
    ],
    signatures: [
        { stage: 'applicant', x: 350, y: 578 },
        { stage: ['hod', 'recommendation'], x: 200, y: 630 },
        { stage: 'dean', x: 80, y: 670 },
        { stage: 'director', x: 80, y: 730 },
    ]
};

// Map of form type name (case-insensitively) to its mapping configuration.
// For testing/fallback, we store the air india one under its true name.
export const formTypePdfMappings: Record<string, PdfMappingConfig> = {
    'application for permission to travel by airline other than air india': airIndiaMapping,
    // Add other form types here in lowercase...
    // 'leave travel concession': leaveTravelConcessionMapping,
};

export const getPdfMappingForForm = (formTypeName: string): PdfMappingConfig | null => {
    return formTypePdfMappings[formTypeName.toLowerCase()] || null;
};
