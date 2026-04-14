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
    size?: number;
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

export const stationLeaveMapping: PdfMappingConfig = {
  fields: [
    // 1. Name
    { getter: (form, getFd) => form.form_data?.Name || form.users?.first_name || '', x: 350, y: 229 },

    // 2. Designation
    { getter: (form, getFd) => getFd('Designation'), x: 350, y: 262 },

    // 3. Department
    { getter: (form, getFd) => getFd('Department'), x: 350, y: 295 },

    // 4. No of days
    {
      getter: (form, getFd) => {
        const val = getFd('Timing(s)');
        if (val && typeof val === 'object') {
          for (const k of Object.keys(val)) {
            if (k.toLowerCase().includes('no_of_days') || k.toLowerCase().includes('no of days')) {
              return String(val[k]);
            }
          }
        }
        return String(getFd('No of days') || '');
      },
      x: 395, y: 327,
    },

    // From date
    {
      getter: (form, getFd) => {
        const val = getFd('Timing(s)');
        if (val && typeof val === 'object') {
          for (const k of Object.keys(val)) {
            if (k.toLowerCase().includes('from')) return String(val[k]);
          }
        }
        return String(getFd('from') || '');
      },
      x: 339, y: 342,
    },

    // To date
    {
      getter: (form, getFd) => {
        const val = getFd('Timing(s)');
        if (val && typeof val === 'object') {
          for (const k of Object.keys(val)) {
            if (k.toLowerCase().includes('to')) return String(val[k]);
          }
        }
        return String(getFd('to') || '');
      },
      x: 449, y: 342,
    },

    // 5. Nature of Leave
    { getter: (form, getFd) => getFd('Nature of Leave'), x: 350, y: 375 },

    // 6. Purpose
    { getter: (form, getFd) => getFd('Purpose'), x: 350, y: 405 },

    // 7. Contact Number
    { getter: (form, getFd) => String(getFd('Contact Number')).substring(0, 100), x: 350, y: 438 },

    // Place
    { getter: (form, getFd) => getFd('Place'), x: 105, y: 502 },

    // Date
    { getter: (form, getFd) => {
        return form.updated_at ? new Date(form.updated_at).toLocaleDateString() : new Date().toLocaleDateString();
    }, x: 105, y: 521 },

    // Permitted
    {
      getter: (form, getFd) => {
        const p = getFd('Permitted');
        return typeof p === 'boolean' ? (p ? 'Yes' : 'No') : String(p || '');
      },
      x: 390,   
      y: 605,
    },
  ],

  signatures: [
    { stage: 'applicant', x: 438, y: 535 },
    { stage: ['hod', 'hod_review'], x: 435, y: 670 },
    { stage: ['ar/dr approval', 'ar_dr_estt approval', 'esst', 'esst section'], x: 80, y: 710 },
  ],
};

export const joiningReportMapping: PdfMappingConfig = {
    fields: [
        // English section (using user-provided coordinates)
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[0] : '';
        }, x: 285, y: 465, size: 10 }, // Session
        
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[1] : '';
        }, x: 78, y: 519, size: 10 }, // Days
        
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[2] : '';
        }, x: 194, y: 520, size: 10 }, // From
        
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[3] : '';
        }, x: 312, y: 520, size: 10 }, // To
        
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[4] : '';
        }, x: 84, y: 548, size: 10 }, // Order No
        
        { getter: (form, getFd) => {
            const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
            return Array.isArray(v) ? v[5] : '';
        }, x: 286, y: 548, size: 10 }, // Order Date

                // Dated
        { 
            getter: (form, getFd) => {
                return getFd('e254b679-1abf-4663-90df-6c84a5fe10d8') || '';
            }, 
            x: 130, y: 658, size: 10 
        },

        // Name
        { 
            getter: (form, getFd) => {
                return getFd('9c2c7544-3751-41f8-a425-a57db1986d3a') || '';
            }, 
            x: 476, y: 664, size: 10 
        },

        // Designation
        { 
            getter: (form, getFd) => {
                return getFd('adf15385-0c12-472c-9a6f-6e9ab5b03fe6') || '';
            }, 
            x: 476, y: 682, size: 10 
        },
    ],
    signatures: [
        { stage: 'applicant', x: 500, y: 630, size: 6},
    ]
};

export const formTypePdfMappings: Record<string, PdfMappingConfig> = {
    'application for permission to travel by airline other than air india': airIndiaMapping,
    'joining report': joiningReportMapping,
    'station leave permission': stationLeaveMapping,
    'station leave': stationLeaveMapping,
    // Add other form types here in lowercase...
    // 'leave travel concession': leaveTravelConcessionMapping,
};

export const getPdfMappingForForm = (formTypeName: string): PdfMappingConfig | null => {
    return formTypePdfMappings[formTypeName.toLowerCase()] || null;
};
