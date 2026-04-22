import * as xlsx from 'xlsx';

export class ExcelService {
    /**
     * Parse an uploaded Excel file and return an array of user objects.
     */
    parseUsersUpload(buffer: Buffer): any[] {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Skip header comment row which is usually row 2 (index 1) in our template
        // Read as array of arrays first to ignore the comment row safely
        const rawData = xlsx.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        
        if (rawData.length < 2) return [];
        
        const headers: string[] = rawData[0] || [];
        const rowsToProcess = rawData.slice(2); // Skip header (row 0) and comment (row 1)
        
        const users: any[] = [];
        for (const row of rowsToProcess) {
            // Stop parsing if we hit completely empty rows
            if (!row || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) {
                continue;
            }
            
            const user: any = {};
            headers.forEach((header, index) => {
                const val = row[index];
                if (val !== undefined && val !== null && val !== '') {
                    user[header] = val;
                }
            });
            
            // basic defaults
            if (user.department_id) user.department_id = Number(user.department_id);
            if (user.role_id) user.role_id = Number(user.role_id);
            if (user.joining_date) user.joining_date = new Date(user.joining_date);
            
            users.push(user);
        }
        
        return users;
    }

    /**
     * Generate the Excel template buffer for download.
     */
    generateTemplate(): Buffer {
        const headers = [
            'first_name', 'middle_name', 'last_name', 'email', 'password',
            'emp_code', 'department_id', 'role_id', 'joining_date', 'auth_provider', 'signature_url'
        ];
        
        const comments = [
            'First Name', 'Middle Name', 'Last Name', 'Unique Email (Required)', 'Temporary password (Required)',
            'Unique Employee Code', 'Numeric ID of department', 'Numeric ID of role/designation', 'YYYY-MM-DD', 'oauth/local', 'URL if any'
        ];
        
        const example1 = [
            'John', '', 'Doe', 'john.doe@example.com', 'securepass123',
            'EMP001', 1, 1, '2023-01-15', 'local', ''
        ];
        
        const example2 = [
            'Jane', 'A.', 'Smith', 'jane.s@example.com', 'pass456',
            'EMP002', 2, 2, '2023-02-01', 'local', ''
        ];
        
        const data = [headers, comments, example1, example2];
        
        const worksheet = xlsx.utils.aoa_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Users_Template');
        
        return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
