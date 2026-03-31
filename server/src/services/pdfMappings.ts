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
    { getter: (form, getFd) => form.form_data?.Name || form.users?.name || '', x: 310, y: 172 },
    { getter: (form, getFd) => getFd('Designation'), x: 310, y: 198 },
    { getter: (form, getFd) => getFd('Department'), x: 310, y: 218 },
    { getter: (form, getFd) => getFd('from'), x: 320, y: 262, size: 10 },
    { getter: (form, getFd) => getFd('to'), x: 435, y: 262, size: 10 },
    { getter: (form, getFd) => getFd('place'), x: 310, y: 287 },
    { getter: (form, getFd) => getFd('purpose'), x: 310, y: 309 },
    { getter: (form, getFd) => String(getFd('sectors')).substring(0, 50), x: 310, y: 338 },
    { getter: (form, getFd) => String(getFd('reason_for_travel')).substring(0, 50), x: 310, y: 392 },
    {
      getter: (form, getFd) => {
        const mhrdObj = getFd('mhrd');
        return typeof mhrdObj === 'boolean' ? (mhrdObj ? 'Yes' : 'No') : String(mhrdObj || '');
      }, x: 435, y: 432
    },
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
    { getter: (form, getFd) => form.form_data?.Name || form.users?.name || '', x: 350, y: 229 },

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
    {
      getter: (form, getFd) => {
        return form.updated_at ? new Date(form.updated_at).toLocaleDateString() : new Date().toLocaleDateString();
      }, x: 105, y: 521
    },

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
    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[0] : '';
      }, x: 285, y: 465, size: 10
    }, // Session

    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[1] : '';
      }, x: 78, y: 519, size: 10
    }, // Days

    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[2] : '';
      }, x: 194, y: 520, size: 10
    }, // From

    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[3] : '';
      }, x: 312, y: 520, size: 10
    }, // To

    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[4] : '';
      }, x: 84, y: 548, size: 10
    }, // Order No

    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[5] : '';
      }, x: 286, y: 548, size: 10
    }, // Order Date

    // Footer
    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[6] : '';
      }, x: 130, y: 658, size: 10
    }, // Dated
    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[7] : '';
      }, x: 476, y: 664, size: 10
    }, // Name
    {
      getter: (form, getFd) => {
        const v = getFd('LETTER') || getFd('Report') || getFd('Joining');
        return Array.isArray(v) ? v[8] : '';
      }, x: 476, y: 682, size: 10
    }, // Designation
  ],
  signatures: [
    { stage: 'applicant', x: 500, y: 630, size: 6 },
  ]
};

export const earnedLeaveMapping: PdfMappingConfig = {
  fields: [
    // 1. Name
    {
      getter: (form, getFd) => getFd('name') || '',
      x: 305, y: 120, size: 10
    },

    // 2. Post held
    {
      getter: (form, getFd) => getFd('designation') || '',
      x: 300, y: 140, size: 10
    },

    // 3. Department
    {
      getter: (form, getFd) => getFd('department') || '',
      x: 305, y: 155, size: 10
    },

    // 4. Nature of leave
    {
      getter: (form, getFd) => getFd('leave type') || getFd('leave_type') || getFd('nature of leave') || getFd('nature_of_leave') || '',
      x: 305, y: 170, size: 10
    },

    // 5. Period of leave
    {
      getter: (form, getFd) => getFd('from date') || getFd('from_date') || getFd('period from') || '',
      x: 300, y: 195, size: 10
    },
    {
      getter: (form, getFd) => getFd('to date') || getFd('to_date') || getFd('period to') || '',
      x: 400, y: 195, size: 10
    },
    {
      getter: (form, getFd) => getFd('days') || getFd('no of days') || getFd('no_of_days') || '',
      x: 465, y: 195, size: 10
    },

    // 6. Prefix
    {
      getter: (form, getFd) => getFd('prefix from') || getFd('prefix_from') || '',
      x: 337, y: 220, size: 10
    },
    {
      getter: (form, getFd) => getFd('prefix to') || getFd('prefix_to') || '',
      x: 397, y: 220, size: 10
    },
    {
      getter: (form, getFd) => getFd('prefix days') || getFd('prefix_days') || '',
      x: 464, y: 220, size: 10
    },

    // 6. Suffix
    {
      getter: (form, getFd) => getFd('suffix from') || getFd('suffix_from') || '',
      x: 337, y: 250, size: 10
    },
    {
      getter: (form, getFd) => getFd('suffix to') || getFd('suffix_to') || '',
      x: 397, y: 250, size: 10
    },
    {
      getter: (form, getFd) => getFd('suffix days') || getFd('suffix_days') || '',
      x: 464, y: 250, size: 10
    },

    // 7. Purpose
    {
      getter: (form, getFd) => getFd('purpose') || getFd('reason') || '',
      x: 300, y: 262, size: 10
    },

    // 8. Alternative arrangements
    {
      getter: (form, getFd) => getFd('arrangements') || getFd('alternative') || '',
      x: 300, y: 301.5, size: 10
    },

    // 9. LTC Block year
    {
      getter: (form, getFd) => getFd('ltc block') || getFd('ltc_block') || getFd('block year') || '',
      x: 110, y: 324, size: 10
    },

    // 10. Address
    {
      getter: (form, getFd) => getFd('address') || '',
      x: 297, y: 340, size: 10
    },
    {
      getter: (form, getFd) => getFd('pin') || getFd('pincode') || '',
      x: 508, y: 352, size: 10
    },
    {
      getter: (form, getFd) => getFd('contact') || getFd('phone') || getFd('mobile') || '',
      x: 371, y: 365, size: 10
    },

    // 11. Station leave
    {
      getter: (form, getFd) => getFd('station leave') || getFd('station_leave') || '',
      x: 300, y: 620, size: 10
    },
    {
      getter: (form, getFd) => getFd('station from') || getFd('station_from') || '',
      x: 331, y: 390, size: 10
    },
    {
      getter: (form, getFd) => getFd('station to') || getFd('station_to') || '',
      x: 440, y: 390, size: 10
    },

    // Footer (Applicant)
    {
      getter: (form, getFd) => getFd('date') || '',
      x: 450, y: 412, size: 10
    },
    //Administation Section 
    {
      getter: (form, getFd) => getFd('nature of leave') || getFd('nature_of_leave') || getFd('leave type') || '',
      x: 101, y: 579, size: 10
    },
    {
      getter: (form, getFd) => getFd('period') || getFd('no of days') || '',
      x: 223, y: 579, size: 10
    },
    {
      getter: (form, getFd) => getFd('from') || getFd('from date') || '',
      x: 323, y: 579, size: 10
    },{
      getter: (form, getFd) => getFd('to') || getFd('to date') || '',
      x: 386, y: 579, size: 10
    },{
      getter: (form, getFd) => getFd('sanctioned') || getFd('approved') || '',
      x: 470, y: 700, size: 10
    },

    // Table row (3 columns)
    { getter: (f,g)=>g('leave type') || g('nature of leave') || '', x:40, y:614, size:10 },
    { getter: (f,g)=>g('balance')||'', x:220, y:614, size:10 },
    { getter: (f,g)=>g('leave applied') || g('leave_applied') || g('days applied') || '', x:375, y:614, size:10 },
  ],

  signatures: [
    { stage: 'applicant', x: 450, y: 412, size: 6 },
    { stage: 'hod', x: 455, y: 500, size: 6 },
    // Admin section
    { stage: 'dealing_assistant', x:75, y:638, size:6 },
    { stage: 'superintendent', x:350, y:638, size:6 },
    { stage: 'registrar', x:530, y:638, size:6 },

    // Final authority single signature us required for this stage who ever signs we keep it there
    { stage: 'Registrar/DeanFaa/Director', x:430, y:723, size:6 }
  ]
};

export const formTypePdfMappings: Record<string, PdfMappingConfig> = {
  'application for permission to travel by airline other than air india': airIndiaMapping,
  'joining report': joiningReportMapping,
  'station leave permission': stationLeaveMapping,
  'station leave': stationLeaveMapping,
  'earned leave application': earnedLeaveMapping,
  'earned leave': earnedLeaveMapping,
  // Add other form types here in lowercase...
  // 'leave travel concession': leaveTravelConcessionMapping,
};

export const getPdfMappingForForm = (formTypeName: string): PdfMappingConfig | null => {
  return formTypePdfMappings[formTypeName.toLowerCase()] || null;
};
