'use client';
// ─── CommentPanel.tsx ─────────────────────────────────────────────────────────
// Sliding right-side panel that shows and manages form comments.

import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useFormComments } from '@/hooks/useFormComments';
import CommentBubble from './CommentBubble';
import CommentInput from './CommentInput';
import { FormComment, CommentType, COMMENT_TYPE_CONFIG } from '@/types/comments';

const FILTER_TYPES: Array<CommentType | 'all'> = [
    'all', 'general', 'forward', 'approval', 'rejection', 'return', 'recall',
];

interface Props {
    formId: number;
    currentUserId?: number;
    isAdmin?: boolean;
    onClose: () => void;
}

export default function CommentPanel({
    formId, currentUserId, isAdmin, onClose
}: Props) {
    const { comments, isLoading, error, addComment, editComment, deleteComment, refetch } = useFormComments(formId);

    const [filterType, setFilterType] = useState<CommentType | 'all'>('all');
    const [replyTo, setReplyTo] = useState<FormComment | null>(null);
    const [editingComment, setEditingComment] = useState<FormComment | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when new comments arrive
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [comments.length]);

    const handleSubmit = async (content: object) => {
        if (editingComment) {
            await editComment(editingComment.id, content);
            setEditingComment(null);
        } else {
            await addComment(content, replyTo?.id);
            setReplyTo(null);
        }
    };

    const handleEdit = (comment: FormComment) => {
        setReplyTo(null);
        setEditingComment(comment);
    };

    const handleReply = (comment: FormComment) => {
        setEditingComment(null);
        setReplyTo(comment);
    };

    const existingTypes = new Set(comments.map(c => c.comment_type));
    const visibleFilters: Array<CommentType | 'all'> = [
        'all',
        ...FILTER_TYPES.filter(t => t !== 'all' && existingTypes.has(t as CommentType)) as CommentType[],
    ];

    const filtered = filterType === 'all'
        ? comments
        : comments.filter(c => c.comment_type === filterType);

    return (
        <div
            style={{
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: '#f8fafc',
                borderLeft: '1px solid #e2e8f0',
                borderRadius: '0 16px 16px 0',
                overflow: 'hidden',
                animation: 'slideInRight 0.25s ease-out',
            }}
        >
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(40px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                .comment-prose p { margin: 0 0 4px; }
                .comment-prose ul, .comment-prose ol { margin: 0 0 4px; padding-left: 18px; }
                .comment-prose li { margin-bottom: 2px; }
                .comment-prose strong { font-weight: 700; }
                .comment-prose em { font-style: italic; }
                .comment-prose u { text-decoration: underline; }
                .comment-prose blockquote { border-left: 3px solid #e2e8f0; margin: 0; padding-left: 8px; color: #6b7280; }
                .filter-pill:hover { opacity: 0.85; }
            `}</style>

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div style={{
                padding: '14px 16px',
                background: '#fff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexShrink: 0,
            }}>
                <MessageSquare size={18} style={{ color: '#6366f1' }} />
                <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>
                        Comments
                    </h2>
                </div>
                <button
                    onClick={() => refetch()}
                    title="Refresh"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '5px',
                        borderRadius: '6px', display: 'flex', color: '#9ca3af',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#374151'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; }}
                >
                    <RefreshCw size={14} />
                </button>
                <button
                    onClick={onClose}
                    title="Close comments"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '5px',
                        borderRadius: '6px', display: 'flex', color: '#9ca3af',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9ca3af'; }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Filter pills ──────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: '6px', padding: '10px 14px',
                overflowX: 'auto', background: '#fff',
                borderBottom: '1px solid #e2e8f0', flexShrink: 0,
            }}>
                {visibleFilters.map(type => {
                    const isActive = filterType === type;
                    const cfg = type !== 'all' ? COMMENT_TYPE_CONFIG[type] : null;
                    return (
                        <button
                            key={type}
                            className="filter-pill"
                            onClick={() => setFilterType(type)}
                            style={{
                                flexShrink: 0, fontSize: '11px', fontWeight: 600,
                                padding: '4px 10px', borderRadius: '999px', border: 'none',
                                cursor: 'pointer', transition: 'all 0.15s',
                                background: isActive
                                    ? (cfg ? cfg.badge : '#e0e7ff')
                                    : '#f1f5f9',
                                color: isActive
                                    ? (cfg ? cfg.badgeText : '#4338ca')
                                    : '#6b7280',
                                boxShadow: isActive ? '0 0 0 1.5px ' + (cfg?.border || '#6366f1') : 'none',
                            }}
                        >
                            {type === 'all' ? 'All' : COMMENT_TYPE_CONFIG[type].label}
                        </button>
                    );
                })}
            </div>

            {/* ── Comment list ──────────────────────────────────────────────── */}
            <div ref={listRef} style={{
                flex: 1, overflowY: 'auto', padding: '14px',
                display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
                        <Loader2 size={24} className="animate-spin" style={{ color: '#6366f1' }} />
                    </div>
                )}

                {!isLoading && error && (
                    <div style={{
                        textAlign: 'center', padding: '40px 16px',
                        color: '#ef4444', fontSize: '13px',
                    }}>
                        {error}
                    </div>
                )}

                {!isLoading && !error && filtered.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, color: '#9ca3af',
                        gap: '10px', paddingTop: '60px',
                    }}>
                        <MessageSquare size={36} style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#64748b' }}>
                            No comments yet
                        </p>
                        <p style={{ fontSize: '12px', margin: 0 }}>
                            {filterType === 'all'
                                ? 'Be the first to leave a comment.'
                                : `No ${COMMENT_TYPE_CONFIG[filterType as CommentType]?.label} comments.`}
                        </p>
                    </div>
                )}

                {!isLoading && filtered.map(comment => (
                    <CommentBubble
                        key={comment.id}
                        comment={comment}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onReply={handleReply}
                        onEdit={handleEdit}
                        onDelete={deleteComment}
                    />
                ))}
            </div>

            {/* ── Input ─────────────────────────────────────────────────────── */}
            <CommentInput
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSubmit={handleSubmit}
                placeholder={
                    editingComment
                        ? 'Edit your comment… (Ctrl+Enter to save)'
                        : replyTo
                            ? `Replying to ${replyTo.commenter?.first_name || 'user'}… (Ctrl+Enter)`
                            : 'Write a comment… (Ctrl+Enter to send)'
                }
            />
        </div>
    );
}
