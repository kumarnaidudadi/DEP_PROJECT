'use client';
// ─── client/hooks/useFormComments.ts ─────────────────────────────────────────
// Data-fetching hook for form comments.

import { useState, useCallback, useEffect } from 'react';
import { FormComment } from '@/types/comments';
import {
    fetchComments,
    postComment,
    patchComment,
    removeComment,
} from '@/services/commentService';

export function useFormComments(formId: number) {
    const [comments, setComments] = useState<FormComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!formId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchComments(formId);
            setComments(data);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Failed to load comments');
        } finally {
            setIsLoading(false);
        }
    }, [formId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const addComment = useCallback(
        async (content: object, parentId?: number) => {
            const comment = await postComment(formId, content, parentId);
            setComments(prev => {
                if (!parentId) {
                    // New top-level comment
                    return [...prev, { ...comment, replies: [] }];
                }
                // Walk the flat replies of each top-level comment to find the root
                return prev.map(c => {
                    // parentId is the top-level comment itself
                    if (c.id === parentId) {
                        return { ...c, replies: [...c.replies, comment] };
                    }
                    // parentId is somewhere inside c's flat replies array
                    const isDescendant = c.replies.some(r => r.id === parentId);
                    if (isDescendant) {
                        return { ...c, replies: [...c.replies, comment] };
                    }
                    return c;
                });
            });
            return comment;
        },
        [formId]
    );


    const editComment = useCallback(
        async (commentId: number, content: object) => {
            const updated = await patchComment(formId, commentId, content);
            setComments(prev =>
                prev.map(c => {
                    if (c.id === commentId) return { ...updated, replies: c.replies };
                    return {
                        ...c,
                        replies: c.replies.map(r =>
                            r.id === commentId ? { ...updated, replies: [] } : r
                        ),
                    };
                })
            );
        },
        [formId]
    );

    const deleteComment = useCallback(
        async (commentId: number) => {
            await removeComment(formId, commentId);
            setComments(prev =>
                prev.map(c => {
                    if (c.id === commentId) return { ...c, is_deleted: true, content: null };
                    return {
                        ...c,
                        replies: c.replies.map(r =>
                            r.id === commentId ? { ...r, is_deleted: true, content: null } : r
                        ),
                    };
                })
            );
        },
        [formId]
    );

    const totalCount = comments.reduce(
        (sum, c) => sum + 1 + (c.replies?.length || 0),
        0
    );

    return { comments, isLoading, error, addComment, editComment, deleteComment, refetch, totalCount };
}
