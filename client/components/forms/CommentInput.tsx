'use client';
// ─── CommentInput.tsx ─────────────────────────────────────────────────────────
// Rich-text editor for composing/replying to comments.

import React, { useState } from 'react';
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
    const [showToolbar, setShowToolbar] = useState(false);

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
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] max-h-[200px] overflow-y-auto p-2',
            },
            handleKeyDown: (view, event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    // Needs to reference the latest handleSubmit, which is tricky in TipTap plugins,
                    // so we use a DOM wrapper for the shortcut, or handle it via a separate ref.
                    // For simplicity, we trigger the submit button click using an ID or ref.
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
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to send comment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!editor) return null;

    const btnStyle = (isActive: boolean) => ({
        padding: '4px',
        background: isActive ? '#e0e7ff' : 'transparent',
        color: isActive ? '#4338ca' : '#6b7280',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    });

    return (
        <div style={{
            borderTop: '1px solid #e2e8f0',
            padding: '12px 14px',
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

            <div style={{
                background: '#f8fafc', borderRadius: '10px',
                border: '1px solid #e2e8f0',
                transition: 'border-color 0.2s',
                display: 'flex', flexDirection: 'column',
                position: 'relative'
            }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlurCapture={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
            >
                {/* Toolbar */}
                {showToolbar && (
                    <div className="animate-fade-in" style={{
                        display: 'flex', gap: '4px', padding: '6px 8px',
                        borderBottom: '1px solid #e2e8f0', alignItems: 'center',
                        flexWrap: 'wrap'
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
                <div style={{ position: 'relative' }}>
                    <EditorContent editor={editor} style={{ minHeight: '80px', maxHeight: '200px', overflowY: 'auto', padding: '0 8px', fontSize: '13px' }} />
                    
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                        <button
                            id="comment-submit-btn"
                            onClick={handleSubmit}
                            disabled={editor.isEmpty || submitting}
                            style={{
                                border: 'none', borderRadius: '7px',
                                width: 32, height: 32,
                                background: !editor.isEmpty && !submitting
                                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                    : '#e5e7eb',
                                color: !editor.isEmpty && !submitting ? '#fff' : '#9ca3af',
                                cursor: !editor.isEmpty && !submitting ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                                boxShadow: !editor.isEmpty && !submitting ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
                            }}
                        >
                            {submitting
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Send size={14} />}
                        </button>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', alignItems: 'center' }}>
                <button
                    onClick={() => setShowToolbar(s => !s)}
                    style={{
                        background: 'none', border: 'none', color: showToolbar ? '#4f46e5' : '#94a3b8',
                        cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: '4px',
                        display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '4px',
                        transition: 'color 0.2s',
                    }}
                    title="Formatting options"
                >
                    Aa
                </button>
                <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                    Ctrl+Enter to send
                </p>
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
