// ─── client/services/commentService.ts ────────────────────────────────────────
// API calls for form comments.

import api from '@/lib/api';
import { FormComment } from '@/types/comments';

export async function fetchComments(formId: number): Promise<FormComment[]> {
    const res = await api.get(`/forms/${formId}/comments`);
    return Array.isArray(res.data) ? res.data : [];
}

export async function postComment(
    formId: number,
    content: object,
    parentCommentId?: number
): Promise<FormComment> {
    const res = await api.post(`/forms/${formId}/comments`, {
        content,
        parent_comment_id: parentCommentId ?? null,
    });
    return res.data;
}

export async function patchComment(
    formId: number,
    commentId: number,
    content: object
): Promise<FormComment> {
    const res = await api.patch(`/forms/${formId}/comments/${commentId}`, { content });
    return res.data;
}

export async function removeComment(
    formId: number,
    commentId: number
): Promise<void> {
    await api.delete(`/forms/${formId}/comments/${commentId}`);
}
