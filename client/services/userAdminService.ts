import api from '@/lib/api';

export interface UserActivityLog {
    id: number;
    user_id: number;
    reason: string;
    action: 'deactivated' | 'activated';
    triggered_by: 'system' | 'admin';
    created_at: string;
}

export interface InactiveUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    emp_code: string;
    is_active: boolean;
    user_activity_logs: UserActivityLog[];
}

export interface ReactivationRequest {
    id: number;
    user_id: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_note?: string;
    created_at: string;
    users: {
        first_name: string;
        last_name: string;
        email: string;
    };
}

export const userAdminService = {
    async addUser(userData: any) {
        const res = await api.post('/user-admin/add', userData);
        return res.data;
    },

    async bulkUpload(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/user-admin/bulk-upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    },

    async downloadTemplate() {
        const res = await api.get('/user-admin/excel-template', {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'users_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    async getInactiveUsers(): Promise<InactiveUser[]> {
        const res = await api.get('/user-admin/inactive');
        return res.data;
    },

    async getAllUsers(): Promise<InactiveUser[]> {
        const res = await api.get('/user-admin/users');
        return res.data;
    },

    async toggleUserStatus(userId: number, isActive: boolean, reason: string) {
        const res = await api.put(`/user-admin/${userId}/status`, { is_active: isActive, reason });
        return res.data;
    },

    async getReactivationRequests(): Promise<ReactivationRequest[]> {
        const res = await api.get('/user-admin/reactivation-requests');
        return res.data;
    },

    async processReactivationRequest(requestId: number, status: 'approved' | 'rejected', adminNote?: string) {
        const res = await api.put(`/user-admin/reactivation-requests/${requestId}/process`, {
            status,
            admin_note: adminNote
        });
        return res.data;
    },

    async submitReactivationRequest(reason: string) {
        const res = await api.post('/user-admin/reactivation-requests', { reason });
        return res.data;
    }
};
