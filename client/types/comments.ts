// ─── client/types/comments.ts ─────────────────────────────────────────────────
// TypeScript types for the form comments system.

export type CommentType = 'general' | 'forward' | 'approval' | 'rejection' | 'return' | 'recall';

export interface FormComment {
    id: number;
    applied_form_id: number;
    comment_type: CommentType;
    content: object | null;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    form_history_id: number | null;
    parent_comment_id: number | null;
    commenter: {
        id: number;
        first_name: string;
        last_name: string;
        emp_code: string;
        roles?: string[];
    } | null;
    form_history?: { 
        action: string;
        acting_users?: { id: number; first_name: string; last_name: string } | null;
        acting_role_label?: string | null;
    } | null;
    replies: FormComment[];
}

export interface CommentTypeConfig {
    label: string;
    border: string;
    bg: string;
    badge: string;
    badgeText: string;
}

export const COMMENT_TYPE_CONFIG: Record<CommentType, CommentTypeConfig> = {
    general: {
        label: 'General',
        border: '#6366f1',
        bg: '#eef2ff',
        badge: '#e0e7ff',
        badgeText: '#4338ca',
    },
    forward: {
        label: 'Forwarded',
        border: '#f59e0b',
        bg: '#fffbeb',
        badge: '#fef3c7',
        badgeText: '#92400e',
    },
    approval: {
        label: 'Approved',
        border: '#10b981',
        bg: '#ecfdf5',
        badge: '#d1fae5',
        badgeText: '#065f46',
    },
    rejection: {
        label: 'Rejected',
        border: '#ef4444',
        bg: '#fef2f2',
        badge: '#fee2e2',
        badgeText: '#991b1b',
    },
    return: {
        label: 'Returned',
        border: '#f97316',
        bg: '#fff7ed',
        badge: '#ffedd5',
        badgeText: '#9a3412',
    },
    recall: {
        label: 'Recalled',
        border: '#8b5cf6',
        bg: '#f5f3ff',
        badge: '#ede9fe',
        badgeText: '#5b21b6',
    },
};
