// ─── formComments.controller.ts ────────────────────────────────────────────────
// HTTP layer for form comment endpoints.
// Access control: commenter must be the applicant OR appear in form_forwards.

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import prismaClient from '../prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapPlainText(text: string): object {
    return {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
}

async function canComment(formId: number, userId: number): Promise<boolean> {
    const form = await prismaClient.applied_forms.findUnique({
        where: { id: formId },
        select: { applicant_id: true },
    });
    if (!form) return false;
    if (form.applicant_id === userId) return true;

    const forward = await prismaClient.form_forwards.findFirst({
        where: { form_id: formId, forwarded_to: userId },
    });
    return !!forward;
}

function selectCommenter() {
    return {
        id: true,
        first_name: true,
        last_name: true,
        emp_code: true,
    } as const;
}

// Walk up the parent chain to find the root (top-level) comment id.
function getRootId(commentId: number, map: Map<number, any>): number {
    const c = map.get(commentId);
    if (!c || c.parent_comment_id === null) return commentId;
    return getRootId(c.parent_comment_id, map);
}

// Fetch ALL comments for the form then build flatten-under-root tree in code.
async function fetchComments(formId: number) {
    const rows = await prismaClient.form_comments.findMany({
        where: { applied_form_id: formId },
        orderBy: { created_at: 'asc' },
        include: {
            user: { select: selectCommenter() },
            form_history: { select: { action: true } },
        },
    });

    // Build a lookup map id → raw row
    const map = new Map<number, any>(rows.map(r => [r.id, r]));

    // Separate top-level from descendants
    const topLevel: any[] = [];
    const descendants: any[] = [];
    for (const row of rows) {
        if (row.parent_comment_id === null) topLevel.push(row);
        else descendants.push(row);
    }

    // Build output map: rootId → sanitized comment with flat replies array
    const outputMap = new Map<number, any>();
    for (const tl of topLevel) {
        outputMap.set(tl.id, { ...sanitizeCommentBase(tl), replies: [] });
    }

    // Attach every descendant under its root ancestor, preserving created_at order
    for (const d of descendants) {
        const rootId = getRootId(d.id, map);
        const root = outputMap.get(rootId);
        if (root) {
            root.replies.push(sanitizeCommentBase(d));
        }
        // If root not found (orphan), skip silently
    }

    return Array.from(outputMap.values());
}

function sanitizeCommentBase(c: any): any {
    return {
        id: c.id,
        applied_form_id: c.applied_form_id,
        comment_type: c.comment_type,
        content: c.is_deleted ? null : c.content,
        is_edited: c.is_edited,
        is_deleted: c.is_deleted,
        created_at: c.created_at,
        updated_at: c.updated_at,
        form_history_id: c.form_history_id,
        parent_comment_id: c.parent_comment_id,
        commenter: c.user
            ? {
                id: c.user.id,
                first_name: c.user.first_name,
                last_name: c.user.last_name,
                emp_code: c.user.emp_code,
              }
            : null,
        form_history: c.form_history ? { action: c.form_history.action } : null,
    };
}

// Kept for use in edit/delete responses — no replies array needed there
function sanitizeComment(c: any): any {
    return { ...sanitizeCommentBase(c), replies: [] };
}

// ─── GET /api/forms/:formId/comments ─────────────────────────────────────────

export const getComments = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const formId = Number(req.params.formId);

    try {
        const comments = await fetchComments(formId);
        res.json(comments);
    } catch (e: any) {
        console.error('[formComments] getComments:', e.message);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};

// ─── POST /api/forms/:formId/comments ────────────────────────────────────────

export const addComment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const formId = Number(req.params.formId);
    const userId = req.user?.userId;

    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { content, parent_comment_id } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }

    const roles = req.user?.roles || [];
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    try {
        const allowed = isAdmin || await canComment(formId, userId);
        if (!allowed) {
            res.status(403).json({ error: 'You do not have permission to comment on this form.' });
            return;
        }

        const comment = await prismaClient.form_comments.create({
            data: {
                applied_form_id: formId,
                commented_by: userId,
                content: typeof content === 'string' ? wrapPlainText(content) : content,
                comment_type: 'general',
                form_history_id: null,
                parent_comment_id: parent_comment_id ? Number(parent_comment_id) : null,
            },
            include: {
                user: { select: selectCommenter() },
                form_history: { select: { action: true } },
            },
        });

        res.status(201).json({ ...sanitizeComment(comment), replies: [] });
    } catch (e: any) {
        console.error('[formComments] addComment:', e.message);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

// ─── PATCH /api/forms/:formId/comments/:commentId ────────────────────────────

export const editComment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const commentId = Number(req.params.commentId);
    const userId = req.user?.userId;

    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { content } = req.body;
    if (!content) { res.status(400).json({ error: 'content is required' }); return; }

    try {
        const existing = await prismaClient.form_comments.findUnique({
            where: { id: commentId },
        });

        if (!existing) { res.status(404).json({ error: 'Comment not found' }); return; }
        if (existing.commented_by !== userId) {
            res.status(403).json({ error: 'You can only edit your own comments.' });
            return;
        }
        if (existing.comment_type !== 'general') {
            res.status(400).json({ error: 'Action-triggered comments cannot be edited.' });
            return;
        }
        if (existing.is_deleted) {
            res.status(400).json({ error: 'Cannot edit a deleted comment.' });
            return;
        }

        const updated = await prismaClient.form_comments.update({
            where: { id: commentId },
            data: {
                content: typeof content === 'string' ? wrapPlainText(content) : content,
                is_edited: true,
                updated_at: new Date(),
            },
            include: {
                user: { select: selectCommenter() },
                form_history: { select: { action: true } },
                replies: {
                    include: {
                        user: { select: selectCommenter() },
                        form_history: { select: { action: true } },
                    },
                },
            },
        });

        res.json(sanitizeComment(updated));
    } catch (e: any) {
        console.error('[formComments] editComment:', e.message);
        res.status(500).json({ error: 'Failed to edit comment' });
    }
};

// ─── DELETE /api/forms/:formId/comments/:commentId ───────────────────────────

export const deleteComment = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const commentId = Number(req.params.commentId);
    const userId = req.user?.userId;
    const userRoles: string[] = req.user?.roles || [];

    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    try {
        const existing = await prismaClient.form_comments.findUnique({
            where: { id: commentId },
        });

        if (!existing) { res.status(404).json({ error: 'Comment not found' }); return; }

        const isAdmin = userRoles.some(r => r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'SUPER_ADMIN');
        const isOwner = existing.commented_by === userId;

        if (!isOwner && !isAdmin) {
            res.status(403).json({ error: 'Only the comment author or an admin can delete this comment.' });
            return;
        }

        const updated = await prismaClient.form_comments.update({
            where: { id: commentId },
            data: { is_deleted: true, updated_at: new Date() },
        });

        res.json({ id: updated.id, is_deleted: true });
    } catch (e: any) {
        console.error('[formComments] deleteComment:', e.message);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};
