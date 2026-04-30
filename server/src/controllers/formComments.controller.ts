// ─── formComments.controller.ts ────────────────────────────────────────────────
// HTTP layer for form comment endpoints.
//
// Visibility rule (Option A — Strict Pairwise Isolation):
//   • ADMIN / SUPER_ADMIN → see ALL comments on the form.
//   • Everyone else       → see only comments where they are the sender OR the receiver.
//     i.e.  commented_by = userId  OR  receiver_id = userId
//
// When adding a comment, receiver_id is auto-determined as the "other party" in
// the commenter's most-recent forwarding involvement for this form.

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

/**
 * Determine the pairwise receiver for a NEW top-level general comment.
 *
 * Priority order:
 *  1. Whoever the commenter most recently FORWARDED TO  (A→B  → receiver = B) ← user's request
 *  2. Whoever most recently FORWARDED TO the commenter  (User→A → receiver = User) — fallback
 *  3. Current form holder (latest forwarded_to) — last resort for applicant before any forward
 */
async function determineReceiverId(formId: number, commenterId: number): Promise<number | null> {
    // Priority 1: most recent forward SENT by this user
    const lastSent = await prismaClient.form_forwards.findFirst({
        where: { form_id: formId, forwarded_by: commenterId },
        orderBy: { forwarded_at: 'desc' },
    });
    if (lastSent) return lastSent.forwarded_to;

    // Priority 2: most recent forward RECEIVED by this user
    const lastReceived = await prismaClient.form_forwards.findFirst({
        where: { form_id: formId, forwarded_to: commenterId },
        orderBy: { forwarded_at: 'desc' },
    });
    if (lastReceived) return lastReceived.forwarded_by;

    // Priority 3: current holder (applicant commenting before any forward exists)
    const latestForward = await prismaClient.form_forwards.findFirst({
        where: { form_id: formId },
        orderBy: { forwarded_at: 'desc' },
    });
    return latestForward?.forwarded_to ?? null;
}

function selectCommenter() {
    return {
        id: true,
        first_name: true,
        last_name: true,
        emp_code: true,
        user_roles: {
            select: { roles: { select: { name: true } } }
        }
    } as const;
}

// Walk up the parent chain to find the root (top-level) comment id.
function getRootId(commentId: number, map: Map<number, any>): number {
    const c = map.get(commentId);
    if (!c || c.parent_comment_id === null) return commentId;
    return getRootId(c.parent_comment_id, map);
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
        receiver_id: c.receiver_id ?? null,
        commenter: c.user
            ? {
                id: c.user.id,
                first_name: c.user.first_name,
                last_name: c.user.last_name,
                emp_code: c.user.emp_code,
                roles: c.user.user_roles?.map((ur: any) => ur.roles?.name).filter(Boolean) || [],
              }
            : null,
        form_history: c.form_history ? { 
            action: c.form_history.action,
            acting_users: c.form_history.acting_users ?? null,
            acting_role_label: c.form_history.acting_role_label ?? null,
        } : null,
    };
}

// Kept for use in edit/delete responses — no replies array needed there
function sanitizeComment(c: any): any {
    return { ...sanitizeCommentBase(c), replies: [] };
}

/**
 * Fetch comments with pairwise visibility applied.
 *
 *  isAdmin = true  → return all comments for the form.
 *  isAdmin = false → return only comments where userId is sender or receiver.
 *
 * We still fetch ALL rows from DB first and filter in code so that reply
 * threading (parent_comment_id) doesn't break when a parent is visible but
 * a sibling reply is not.
 */
async function fetchComments(formId: number, userId?: number, isAdmin: boolean = false) {
    // Always fetch all rows so tree-building stays consistent
    const rows = await prismaClient.form_comments.findMany({
        where: { applied_form_id: formId },
        orderBy: { created_at: 'asc' },
        include: {
            user: { select: selectCommenter() },
            form_history: { 
                select: { 
                    action: true,
                    acting_users: { select: { id: true, first_name: true, last_name: true } },
                    acting_role_label: true
                } 
            },
        },
    });

    // Determine which comment IDs are visible to this user
    let visibleIds: Set<number>;
    if (isAdmin || !userId) {
        // Admin sees everything
        visibleIds = new Set(rows.map(r => r.id));
    } else {
        // Pairwise: visible if sender or receiver
        const directlyVisible = new Set(
            rows
                .filter(r => r.commented_by === userId || r.receiver_id === userId)
                .map(r => r.id)
        );

        // Also expose replies to visible top-level comments that themselves pass
        // the same filter — keeps thread coherent.
        const map = new Map<number, any>(rows.map(r => [r.id, r]));
        visibleIds = new Set<number>();
        for (const row of rows) {
            if (directlyVisible.has(row.id)) {
                visibleIds.add(row.id);
            } else if (row.parent_comment_id !== null) {
                // Include reply if its root ancestor is visible to this user
                const rootId = getRootId(row.id, map);
                if (directlyVisible.has(rootId)) {
                    visibleIds.add(row.id);
                }
            }
        }
    }

    const visibleRows = rows.filter(r => visibleIds.has(r.id));

    // Build lookup map id → raw row (for the visible set)
    const map = new Map<number, any>(visibleRows.map(r => [r.id, r]));

    // Separate top-level from descendants
    const topLevel: any[] = [];
    const descendants: any[] = [];
    for (const row of visibleRows) {
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
    }

    return Array.from(outputMap.values());
}

// ─── GET /api/forms/:formId/comments ─────────────────────────────────────────

export const getComments = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const formId = Number(req.params.formId);
    const userId = req.user?.userId;
    const roles: string[] = req.user?.roles || [];
    const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');

    try {
        const comments = await fetchComments(formId, userId, isAdmin);
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

        // ── Determine pairwise receiver ──────────────────────────────────────
        // Replies → receiver is the author of the parent comment (direct response)
        // Top-level general comments → receiver is whoever this user last forwarded to
        let receiverId: number | null = null;
        if (parent_comment_id) {
            const parent = await prismaClient.form_comments.findUnique({
                where: { id: Number(parent_comment_id) },
                select: { commented_by: true },
            });
            receiverId = parent?.commented_by ?? null;
        } else {
            receiverId = await determineReceiverId(formId, userId);
        }

        const comment = await prismaClient.form_comments.create({
            data: {
                applied_form_id: formId,
                commented_by: userId,
                receiver_id: receiverId,
                content: typeof content === 'string' ? wrapPlainText(content) : content,
                comment_type: 'general',
                form_history_id: null,
                parent_comment_id: parent_comment_id ? Number(parent_comment_id) : null,
            },
            include: {
                user: { select: selectCommenter() },
                form_history: { 
                    select: { 
                        action: true,
                        acting_users: { select: { id: true, first_name: true, last_name: true } },
                        acting_role_label: true
                    } 
                },
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
                form_history: { 
                    select: { 
                        action: true,
                        acting_users: { select: { id: true, first_name: true, last_name: true } },
                        acting_role_label: true
                    } 
                },
                replies: {
                    include: {
                        user: { select: selectCommenter() },
                        form_history: { 
                            select: { 
                                action: true,
                                acting_users: { select: { id: true, first_name: true, last_name: true } },
                                acting_role_label: true
                            } 
                        },
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
