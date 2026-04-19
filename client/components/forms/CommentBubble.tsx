'use client';
// ─── CommentBubble.tsx ────────────────────────────────────────────────────────
// Renders a single comment card (top-level or reply) with flat threaded display.
// All descendants are shown at the same indentation under the root comment,
// each with a "↩ replying to [Name]" chip (GitHub/Linear style).

import React, { useState } from 'react';
import { Edit2, Trash2, Reply, Loader2 } from 'lucide-react';
import { FormComment, COMMENT_TYPE_CONFIG } from '@/types/comments';

// ─── TipTap / ProseMirror content renderer ───────────────────────────────────
function renderNode(node: any): string {
    if (!node) return '';
    if (node.type === 'text') {
        let text = (node.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (node.marks) {
            for (const mark of node.marks) {
                if (mark.type === 'bold') text = `<strong>${text}</strong>`;
                else if (mark.type === 'italic') text = `<em>${text}</em>`;
                else if (mark.type === 'underline') text = `<u>${text}</u>`;
                else if (mark.type === 'strike') text = `<s>${text}</s>`;
                else if (mark.type === 'code') text = `<code>${text}</code>`;
                else if (mark.type === 'link') text = `<a href="${mark.attrs?.href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
        }
        return text;
    }
    if (node.type === 'hard_break') return '<br/>';
    const children = (node.content || []).map(renderNode).join('');
    switch (node.type) {
        case 'doc': return children;
        case 'paragraph': return `<p>${children}</p>`;
        case 'bullet_list': return `<ul>${children}</ul>`;
        case 'ordered_list': return `<ol>${children}</ol>`;
        case 'list_item': return `<li>${children}</li>`;
        case 'blockquote': return `<blockquote>${children}</blockquote>`;
        case 'heading': return `<h${node.attrs?.level || 2}>${children}</h${node.attrs?.level || 2}>`;
        case 'table': return `<table>${children}</table>`;
        case 'table_row': return `<tr>${children}</tr>`;
        case 'table_cell': return `<td>${children}</td>`;
        case 'table_header': return `<th>${children}</th>`;
        default: return children;
    }
}

function renderTipTapToHTML(json: object | null | undefined): string {
    if (!json) return '';
    try { return renderNode(json); } catch { return ''; }
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
    const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${hue}, 60%, 46%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: size * 0.38, fontWeight: 700,
        }}>
            {initials}
        </div>
    );
}

// ─── Helper: get display name from a commenter object ─────────────────────────
function displayName(commenter: FormComment['commenter']): string {
    if (!commenter) return 'Someone';
    return `${commenter.first_name || ''} ${commenter.last_name || ''}`.trim() || 'Unknown';
}

// ─── Single comment card (used for both top-level and reply cards) ────────────
interface CardProps {
    comment: FormComment;
    /** Name of the direct parent's commenter (for the "↩ replying to" chip) */
    replyingToName?: string;
    currentUserId?: number;
    isAdmin?: boolean;
    isReply?: boolean;
    onReply?: (comment: FormComment) => void;
    onEdit?: (comment: FormComment) => void;
    onDelete?: (commentId: number) => void;
}

function CommentCard({
    comment, replyingToName, currentUserId, isAdmin,
    isReply = false, onReply, onEdit, onDelete,
}: CardProps) {
    const [deleting, setDeleting] = useState(false);
    const cfg = COMMENT_TYPE_CONFIG[comment.comment_type] ?? COMMENT_TYPE_CONFIG.general;
    const isOwner = !!(currentUserId && comment.commenter?.id === currentUserId);
    const name = displayName(comment.commenter);
    const htmlContent = renderTipTapToHTML(comment.content as object | null);

    const fmtDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            + ', '
            + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this comment?')) return;
        setDeleting(true);
        try { await onDelete?.(comment.id); } finally { setDeleting(false); }
    };

    return (
        <div className="group relative pl-6 pb-2">
            <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-gray-300"></div>
            {/* "Replying to" chip — only for replies */}
            {isReply && replyingToName && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', color: '#9ca3af', marginBottom: '6px',
                    fontWeight: 500,
                }}>
                    <span style={{ fontSize: '12px' }}>↩</span>
                    <span>replying to <strong style={{ color: '#6b7280', fontWeight: 600 }}>{replyingToName}</strong></span>
                </div>
            )}

            {/* Commenter & Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Avatar name={name} size={isReply ? 22 : 26} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: isReply ? '11px' : '12px', fontWeight: 700, color: '#1f2937' }}>
                                {name}
                            </span>
                            <span style={{
                                fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                                borderRadius: '999px', background: cfg.badge, color: cfg.badgeText,
                                letterSpacing: '0.3px', border: `1px solid ${cfg.border}30`
                            }}>
                                {cfg.label}
                            </span>
                            {comment.is_edited && (
                                <span style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>edited</span>
                            )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                            {comment.commenter?.roles?.[0] || 'User'}
                            {comment.commenter?.emp_code && ` · ${comment.commenter.emp_code}`}
                        </div>
                    </div>
                </div>
                <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap', marginTop: '2px' }}>
                    {fmtDate(comment.created_at)}
                </span>
            </div>

            {/* Content */}
            {comment.is_deleted ? (
                <p style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
                    This comment was deleted.
                </p>
            ) : (
                <div
                    className="prose prose-sm max-w-none"
                    style={{ fontSize: isReply ? '12px' : '13px', color: '#374151' }}
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            )}

            {/* Action row */}
            {!comment.is_deleted && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ display: 'flex', gap: '4px', marginTop: '7px', alignItems: 'center' }}>
                    {/* Reply available on ALL cards */}
                    {onReply && (
                        <ActionBtn icon={<Reply size={11} />} label="Reply" onClick={() => onReply(comment)} hoverColor="#6366f1" />
                    )}
                    {/* Edit only owner + general type */}
                    {isOwner && comment.comment_type === 'general' && onEdit && (
                        <ActionBtn icon={<Edit2 size={11} />} label="Edit" onClick={() => onEdit(comment)} hoverColor="#6366f1" />
                    )}
                    {/* Delete owner or admin */}
                    {(isOwner || isAdmin) && onDelete && (
                        <ActionBtn
                            icon={deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            label="Delete"
                            onClick={handleDelete}
                            disabled={deleting}
                            hoverColor="#ef4444"
                            hoverBg="#fef2f2"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Small reusable action button ─────────────────────────────────────────────
function ActionBtn({
    icon, label, onClick, disabled, hoverColor = '#374151', hoverBg = '#f1f5f9',
}: {
    icon: React.ReactNode; label: string; onClick: () => void;
    disabled?: boolean; hoverColor?: string; hoverBg?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '11px', background: 'none', border: 'none',
                color: '#9ca3af', cursor: disabled ? 'not-allowed' : 'pointer',
                padding: '2px 6px', borderRadius: '4px', fontWeight: 600,
                transition: 'all 0.1s', opacity: disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => {
                if (!disabled) {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.color = hoverColor;
                }
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#9ca3af';
            }}
        >
            {icon} {label}
        </button>
    );
}

// ─── CommentBubble: top-level card + collapsible flat replies ────────────────
interface Props {
    comment: FormComment;
    currentUserId?: number;
    isAdmin?: boolean;
    onReply: (comment: FormComment) => void;
    onEdit: (comment: FormComment) => void;
    onDelete: (commentId: number) => void;
}

export default function CommentBubble({ comment, currentUserId, isAdmin, onReply, onEdit, onDelete }: Props) {
    const [repliesOpen, setRepliesOpen] = useState(false);

    // Build a quick lookup map of id → commenter name from within this thread
    // so we can display "↩ replying to [Name]" on each reply card.
    const nameMap = new Map<number, string>();
    nameMap.set(comment.id, displayName(comment.commenter));
    for (const r of comment.replies || []) {
        nameMap.set(r.id, displayName(r.commenter));
    }

    const replyCount = (comment.replies || []).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {/* Top-level comment */}
            <CommentCard
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Replies collapse toggle + thread */}
            {replyCount > 0 && (
                <div style={{ marginLeft: '20px' }}>
                    {/* Toggle button */}
                    <button
                        onClick={() => setRepliesOpen(o => !o)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '11px', fontWeight: 600,
                            color: repliesOpen ? '#6b7280' : '#6366f1',
                            padding: '4px 2px',
                            transition: 'color 0.15s',
                            marginTop: '3px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#6366f1'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = repliesOpen ? '#6b7280' : '#6366f1'; }}
                    >
                        <span style={{
                            display: 'inline-block',
                            transform: repliesOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s',
                            fontSize: '10px',
                            lineHeight: 1,
                        }}>
                            ▾
                        </span>
                        {repliesOpen ? `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                    </button>

                    {/* Flat replies — all descendants at same indent level */}
                    {repliesOpen && (
                        <div style={{
                            borderLeft: '2px solid #e2e8f0',
                            paddingLeft: '10px',
                            marginTop: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                        }}>
                            {comment.replies.map(reply => {
                                const parentName = reply.parent_comment_id
                                    ? (nameMap.get(reply.parent_comment_id) ?? displayName(comment.commenter))
                                    : undefined;
                                return (
                                    <CommentCard
                                        key={reply.id}
                                        comment={reply}
                                        replyingToName={parentName}
                                        currentUserId={currentUserId}
                                        isAdmin={isAdmin}
                                        isReply
                                        onReply={onReply}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
