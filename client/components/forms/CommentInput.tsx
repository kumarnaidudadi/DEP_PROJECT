'use client';
// ─── CommentInput.tsx ─────────────────────────────────────────────────────────
// Rich-text editor for composing/replying to comments.

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, Table as TableIcon, Link as LinkIcon } from 'lucide-react';
import { FormComment } from '@/types/comments';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import LinkExt from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

interface Props {
    replyTo?: FormComment | null;
    onCancelReply?: () => void;
    onSubmit: (content: object) => Promise<void>;
    placeholder?: string;
}

export default function CommentInput({ replyTo, onCancelReply, onSubmit, placeholder }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsFocused(false);
                setShowToolbar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            UnderlineExt,
            Table.configure({ resizable: false }),
            TableRow,
            TableCell,
            TableHeader,
            LinkExt.configure({ openOnClick: false }),
            Placeholder.configure({ placeholder: placeholder || 'Write a comment... (Ctrl+Enter to send)' }),
        ],
        content: '',
        onFocus: () => setIsFocused(true),
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[50px] overflow-y-auto w-full p-2',
            },
            handleKeyDown: (view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    const submitBtn = document.getElementById('comment-submit-btn');
                    if (submitBtn) submitBtn.click();
                    return true;
                }
                return false;
            }
        },
    });

    const handleSubmit = async () => {
        if (!editor || editor.isEmpty || submitting) return;
        setSubmitting(true);
        try {
            await onSubmit(editor.getJSON());
            editor.commands.clearContent();
            setIsFocused(false);
            setShowToolbar(false);
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to send comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!editor) return null;

    const btnStyle = (isActive: boolean) => ({
        padding: '3px',
        background: isActive ? '#e0e7ff' : 'transparent',
        color: isActive ? '#4338ca' : '#6b7280',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
    });

    return (
        <div style={{
            borderTop: '1px solid #e2e8f0',
            padding: '16px',
            background: '#fff',
            flexShrink: 0,
        }}>
            {replyTo && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginBottom: '8px', padding: '5px 10px',
                    background: '#f0f9ff', borderRadius: '6px',
                    border: '1px solid #bae6fd', fontSize: '11px',
                    color: '#0369a1', fontWeight: 600,
                }}>
                    <span style={{ flex: 1 }}>
                        Replying to {replyTo.commenter?.first_name || 'User'}
                    </span>
                    <button onClick={onCancelReply} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={13} style={{ color: '#0369a1' }} />
                    </button>
                </div>
            )}

            <div 
                ref={containerRef}
                className="border border-gray-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all flex flex-col p-2"
                onClick={() => setIsFocused(true)}
            >
                {/* Toolbar */}
                {isFocused && showToolbar && (
                    <div style={{
                        display: 'flex', gap: '4px', paddingBottom: '6px',
                        borderBottom: '1px solid #f1f5f9',
                        alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px'
                    }}>
                        <button type="button" style={btnStyle(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('underline'))} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }} />
                        
                        <button type="button" style={btnStyle(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }} />
                        
                        <button type="button" style={btnStyle(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></button>
                        <button type="button" style={btnStyle(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }} />
                        
                        <button type="button" style={btnStyle(false)} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={14} /></button>
                        
                        <div style={{ width: '1px', height: '16px', background: '#cbd5e1', margin: '0 4px' }} />
                        
                        <button type="button" style={btnStyle(editor.isActive('link'))} onClick={() => {
                            const url = window.prompt('Enter URL');
                            if (url) editor.chain().focus().setLink({ href: url }).run();
                        }}><LinkIcon size={14} /></button>
                    </div>
                )}

                {/* Editor Content */}
                <EditorContent
                    editor={editor}
                    style={{
                        minHeight: isFocused ? '100px' : '40px', maxHeight: '300px', overflowY: 'auto',
                        fontSize: '14px', lineHeight: 1.6, width: '100%', cursor: 'text'
                    }}
                />

                {/* Action Bar */}
                {isFocused && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowToolbar(prev => !prev); }}
                                style={{
                                    background: showToolbar ? '#e0e7ff' : '#f1f5f9',
                                    color: showToolbar ? '#4338ca' : '#64748b',
                                    border: 'none', borderRadius: '4px', padding: '4px 8px',
                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    transition: 'all 0.15s'
                                }}
                            >
                                <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '13px' }}>Aa</span>
                            </button>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                                Ctrl+Enter to send
                            </p>
                        </div>
                        <button
                            id="comment-submit-btn"
                            onClick={handleSubmit}
                            disabled={editor.isEmpty || submitting}
                            style={{
                                background: '#4f46e5', color: '#fff',
                                padding: '6px 14px', borderRadius: '6px',
                                fontSize: '12px', fontWeight: 500, border: 'none',
                                cursor: editor.isEmpty || submitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                transition: 'opacity 0.15s',
                                opacity: editor.isEmpty || submitting ? 0.4 : 1,
                            }}
                        >
                            {submitting && <Loader2 size={14} className="animate-spin" />}
                            <Send size={14} /> Send
                        </button>
                    </div>
                )}
            </div>
            <style>{`
            .ProseMirror p.is-editor-empty:first-child::before {
                color: #9ca3af;
                content: attr(data-placeholder);
                float: left;
                height: 0;
                pointer-events: none;
            }
            .ProseMirror { outline: none; }
            .ProseMirror p { margin: 0.5em 0; }
            `}</style>
        </div>
    );
}
