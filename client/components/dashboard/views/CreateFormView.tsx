'use client';

import React from 'react';
import {
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Copy,
    Eye,
    EyeOff,
    GripVertical,
    Loader2,
    Plus,
    Trash2,
} from 'lucide-react';
import FormBuilderPreview from '@/components/ui/FormBuilderPreview';
import FieldTypePicker from '@/components/ui/FieldTypePicker';
import {
    BuilderField,
    createBuilderField,
    createBuilderFieldId,
    suggestFieldTypeFromName,
} from '@/types';

/* ─── Shared inline styles ─────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

const inputStyleSm: React.CSSProperties = {
    ...inputStyle, padding: '7px 10px', fontSize: '12px', borderRadius: '6px',
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280',
    marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
    padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const btnPrimary: React.CSSProperties = {
    padding: '9px 20px', border: 'none',
    background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
    borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
};

const btnSecondary: React.CSSProperties = {
    padding: '9px 16px', border: '1px solid #d1d5db', background: '#fff',
    borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer',
    fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px',
};

const btnSmall: React.CSSProperties = {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px',
    padding: '4px 8px', cursor: 'pointer', display: 'inline-flex',
    alignItems: 'center', gap: '4px', fontSize: '11px', color: '#6b7280',
    fontWeight: 500,
};

function cloneField(field: BuilderField): BuilderField {
    return {
        ...field,
        id: createBuilderFieldId(),
        options: field.options ? [...field.options] : undefined,
        conditionalLogic: field.conditionalLogic ? { ...field.conditionalLogic } : null,
        subFields: field.subFields?.map(sf => ({ ...sf, options: sf.options ? [...sf.options] : undefined })),
    };
}

function getDefaultFieldOptions(type: string) {
    if (type === 'select') return ['Option 1', 'Option 2'];
    if (type === 'paragraph_blanks') return ['I confirm that [____].'];
    return undefined;
}

/* ─── Props ────────────────────────────────────────────────────────────────── */

interface Props {
    isEdit: boolean;
    newFormName: string;
    newFormDesc: string;
    formFields: BuilderField[];
    approvalRoles: string[];
    availableRoles: string[];
    creating: boolean;
    createSuccess: boolean;
    onNameChange: (v: string) => void;
    onDescChange: (v: string) => void;
    onFieldsChange: (fields: BuilderField[]) => void;
    onApprovalRolesChange: (roles: string[]) => void;
    onSave: () => void;
    onCancel: () => void;
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function CreateFormView({
    isEdit, newFormName, newFormDesc, formFields, approvalRoles, availableRoles,
    creating, createSuccess, onNameChange, onDescChange, onFieldsChange, onApprovalRolesChange,
    onSave, onCancel,
}: Props) {
    const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);
    const [draggableIdx, setDraggableIdx] = React.useState<number | null>(null);
    const [recentFieldTypes, setRecentFieldTypes] = React.useState<string[]>([]);
    const [previewEnabled, setPreviewEnabled] = React.useState(true);
    const [previewData, setPreviewData] = React.useState<Record<string, unknown>>({});
    const [expandedCondIdx, setExpandedCondIdx] = React.useState<number | null>(null);
    const [expandedHelpKeys, setExpandedHelpKeys] = React.useState<Record<number, boolean>>({});
    const paragraphTemplateRefs = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

    const [isMobile, setIsMobile] = React.useState(false);
    const [leftOpen, setLeftOpen] = React.useState(false);
    const [rightOpen, setRightOpen] = React.useState(false);
    const [showAllRoles, setShowAllRoles] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1200);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        try { const s = window.localStorage.getItem('dep_builder_recent_field_types'); if (s) { const p = JSON.parse(s); if (Array.isArray(p)) setRecentFieldTypes(p); } } catch { /* ignore */ }
    }, []);
    React.useEffect(() => {
        if (typeof window !== 'undefined') window.localStorage.setItem('dep_builder_recent_field_types', JSON.stringify(recentFieldTypes.slice(0, 6)));
    }, [recentFieldTypes]);

    const touchRecent = React.useCallback((type: string) => {
        setRecentFieldTypes(c => [type, ...c.filter(t => t !== type)].slice(0, 6));
    }, []);

    /* ── Immutable updaters ──────────────────────────────────────────────── */

    const updateField = React.useCallback((fi: number, fn: (f: BuilderField) => BuilderField) => {
        onFieldsChange(formFields.map((f, j) => j === fi ? fn(f) : f));
    }, [formFields, onFieldsChange]);

    const applyFieldType = React.useCallback((fi: number, nextType: string) => {
        updateField(fi, field => {
            const typeChanged = field.type !== nextType;
            const f: BuilderField = { ...field, type: nextType, required: nextType === 'heading' ? false : field.required };
            if (nextType === 'select' || nextType === 'paragraph_blanks') {
                const sanitized = (field.options || []).map(opt => opt.trim()).filter(Boolean);
                f.options = typeChanged ? getDefaultFieldOptions(nextType) : (sanitized.length > 0 ? sanitized : getDefaultFieldOptions(nextType));
            } else {
                f.options = undefined;
            }
            if ((nextType === 'tuple' || nextType === 'list') && (!f.subFields || f.subFields.length === 0)) f.subFields = [{ name: '', type: 'text' }];
            if (nextType !== 'tuple' && nextType !== 'list') f.subFields = undefined;
            if (nextType !== 'number') { f.min = undefined; f.max = undefined; }
            return f;
        });
        touchRecent(nextType);
    }, [touchRecent, updateField]);

    const insertParagraphBlank = React.useCallback((fieldId: string, fi: number) => {
        const textarea = paragraphTemplateRefs.current[fieldId];
        const blankToken = '[____]';
        const currentValue = formFields[fi]?.options?.[0] || '';

        if (!textarea) {
            updateField(fi, f => ({ ...f, options: [`${currentValue}${blankToken}`] }));
            return;
        }

        const start = textarea.selectionStart ?? currentValue.length;
        const end = textarea.selectionEnd ?? start;
        const nextValue = `${currentValue.slice(0, start)}${blankToken}${currentValue.slice(end)}`;

        updateField(fi, f => ({ ...f, options: [nextValue] }));

        requestAnimationFrame(() => {
            const nextTextarea = paragraphTemplateRefs.current[fieldId];
            if (!nextTextarea) return;
            const cursor = start + blankToken.length;
            nextTextarea.focus();
            nextTextarea.setSelectionRange(cursor, cursor);
        });
    }, [formFields, updateField]);

    /* ── Drag & Drop ─────────────────────────────────────────────────────── */

    const handleDragStart = React.useCallback((fi: number) => setDraggedIdx(fi), []);
    const handleDragOver = React.useCallback((e: React.DragEvent, fi: number) => { e.preventDefault(); setDragOverIdx(fi); }, []);
    const handleDrop = React.useCallback((tfi: number) => {
        if (draggedIdx === null) { setDragOverIdx(null); return; }
        const next = [...formFields];
        const [moved] = next.splice(draggedIdx, 1);
        if (!moved) { setDraggedIdx(null); setDragOverIdx(null); return; }
        next.splice(tfi, 0, moved);
        onFieldsChange(next); 
        setDraggedIdx(null); 
        setDragOverIdx(null);
    }, [formFields, draggedIdx, onFieldsChange]);

    React.useEffect(() => {
        let scrollFrame: number;
        const handleDrag = (e: DragEvent) => {
            if (draggedIdx === null || !e.clientY) return;
            const threshold = 100;
            const scrollSpeed = 15;
            const doScroll = () => {
                if (e.clientY < threshold) {
                    window.scrollBy(0, -scrollSpeed);
                    scrollFrame = requestAnimationFrame(doScroll);
                } else if (window.innerHeight - e.clientY < threshold) {
                    window.scrollBy(0, scrollSpeed);
                    scrollFrame = requestAnimationFrame(doScroll);
                }
            };
            cancelAnimationFrame(scrollFrame);
            if (e.clientY < threshold || window.innerHeight - e.clientY < threshold) scrollFrame = requestAnimationFrame(doScroll);
        };
        const handleDragEnd = () => cancelAnimationFrame(scrollFrame);
        window.addEventListener('dragover', handleDrag);
        window.addEventListener('dragend', handleDragEnd);
        window.addEventListener('drop', handleDragEnd);
        return () => {
            window.removeEventListener('dragover', handleDrag);
            window.removeEventListener('dragend', handleDragEnd);
            window.removeEventListener('drop', handleDragEnd);
            cancelAnimationFrame(scrollFrame);
        };
    }, [draggedIdx]);

    const flexLayoutProps = isMobile ? { justifyContent: 'center' } : {};

    const leftAsideStyle: React.CSSProperties = isMobile ? {
        position: 'fixed',
        left: leftOpen ? 0 : '-300px',
        top: 0,
        bottom: 0,
        width: '260px',
        zIndex: 50,
        background: '#f8fafc',
        boxShadow: '4px 0 16px rgba(0,0,0,0.15)',
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '24px 16px',
        overflowY: 'auto'
    } : {
        width: '240px', flexShrink: 0, position: 'sticky', top: '24px', alignSelf: 'flex-start'
    };

    /* ─── Render ──────────────────────────────────────────────────────────── */

    return (
        <div style={{ display: 'flex', gap: '24px', padding: '24px', maxWidth: '1720px', margin: '0 auto', ...flexLayoutProps, position: 'relative' }}>
            {isMobile && (
                <div style={{ position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: 40 }}>
                    {!leftOpen && (
                        <button type="button" onClick={() => setLeftOpen(true)} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto', background: '#2563eb', color: '#fff', border: 'none', padding: '12px 4px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', boxShadow: '2px 0 8px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ writingMode: 'vertical-rl', transform: 'scale(-1, -1)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>ACTIONS</span>
                        </button>
                    )}
                    {!rightOpen && (
                        <button type="button" onClick={() => setRightOpen(true)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto', background: '#2563eb', color: '#fff', border: 'none', padding: '12px 4px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', boxShadow: '-2px 0 8px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ writingMode: 'vertical-rl', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>PREVIEW</span>
                        </button>
                    )}
                </div>
            )}

            {isMobile && leftOpen && (
                <div onClick={() => setLeftOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 45, backdropFilter: 'blur(2px)' }} />
            )}

            {/* ── LEFT SIDEBAR: Actions ──────────────────────────── */}
            <aside style={leftAsideStyle}>
                {isMobile && (
                    <button type="button" onClick={() => setLeftOpen(false)} style={{ marginBottom: '16px', background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Close Actions →</span>
                    </button>
                )}
                <div style={cardStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
                        Form Actions
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button type="button" onClick={onSave} disabled={creating}
                            style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}>
                            {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                            {creating ? 'Saving...' : isEdit ? 'Update Form' : 'Save Form'}
                        </button>
                        <button type="button" onClick={onCancel} style={{ ...btnSecondary, width: '100%', justifyContent: 'center' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
            <main style={{ flex: 1, minWidth: 0, maxWidth: '860px', width: '100%' }}>

                <div style={{ ...cardStyle, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                            {isEdit ? 'Edit Form Type' : 'Create New Form Type'}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            Define fields and approval roles for your form.
                        </p>
                    </div>
                    <button type="button" onClick={() => setPreviewEnabled(c => !c)}
                        style={{ ...btnSmall, padding: '6px 10px', borderRadius: '8px' }}
                        title={previewEnabled ? 'Hide preview' : 'Show preview'}>
                        {previewEnabled ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                </div>

                {createSuccess && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#15803d', marginBottom: '16px' }}>
                        Form {isEdit ? 'updated' : 'created'} successfully.
                    </div>
                )}

                {/* Form Details */}
                <div style={{ ...cardStyle, marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Form Details</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Form Title</label>
                            <input value={newFormName} onChange={e => onNameChange(e.target.value)} placeholder="e.g. Leave Application" style={inputStyle} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea value={newFormDesc} onChange={e => onDescChange(e.target.value)} placeholder="Brief description of the form" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                {/* Global Approval Roles */}
                <div style={{ ...cardStyle, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Required Approvals</div>
                        <button type="button" onClick={() => setShowAllRoles(!showAllRoles)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#2563eb', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {showAllRoles ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {showAllRoles ? 'View Less' : 'View All Roles'}
                        </button>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.4' }}>Select which roles are required to sequentially or parallelly approve this form before it gets a final approved status.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                        {availableRoles.map(role => {
                            const sel = approvalRoles.includes(role);
                            const primary = ['HEAD_OF_DEPARTMENT', 'SECTION_INCHARGE', 'AR_DR_ESTT', 'REGISTRAR'].includes(role);
                            if (!showAllRoles && !primary && !sel) return null;
                            return (
                                <button key={role} type="button" onClick={() => onApprovalRolesChange(sel ? approvalRoles.filter(r => r !== role) : [...approvalRoles, role])}
                                    style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: sel ? '#2563eb' : '#fff', color: sel ? '#fff' : '#6b7280', boxShadow: sel ? '0 2px 6px rgba(37,99,235,0.3)' : '0 0 0 1px #e5e7eb' }}>
                                    {role}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Fields */}
                <div style={{ ...cardStyle }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>Form Fields</span>
                        <button type="button" onClick={() => onFieldsChange([...formFields, createBuilderField()])}
                            style={{ ...btnSmall, color: '#2563eb' }}>
                            <Plus size={12} /> Add Field
                        </button>
                    </div>

                    {formFields.length === 0 && (
                        <div onDragOver={e => { e.preventDefault(); setDragOverIdx(0); }}
                            onDrop={e => { e.stopPropagation(); handleDrop(0); }}
                            style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '8px', background: '#f9fafb' }}>
                            Drop a field here or click &quot;Add Field&quot;.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {formFields.map((field, fi) => {
                            const isDragging = draggedIdx === fi;
                            const isOver = dragOverIdx === fi && !isDragging;
                            const suggestion = suggestFieldTypeFromName(field.name);
                            const isHeading = field.type === 'heading';
                            const condExpanded = expandedCondIdx === fi;

                            const depOptions = formFields
                                .filter((c, i) => c.id !== field.id && c.name.trim() && c.type !== 'heading' && i < fi)
                                .map(c => ({ id: c.id, label: c.name }));

                            return (
                                <React.Fragment key={field.id}>
                                {isOver && <div style={{ height: '4px', background: '#3b82f6', borderRadius: '2px', width: '100%', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />}
                                <div
                                    draggable={draggableIdx === fi}
                                    onDragStart={() => handleDragStart(fi)}
                                    onDragOver={e => handleDragOver(e, fi)}
                                    onDrop={e => { e.stopPropagation(); handleDrop(fi); }}
                                    onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); setDraggableIdx(null); }}
                                    style={{
                                        background: isHeading ? '#f1f5f9' : '#fff', borderRadius: '10px', border: '1px solid #e5e7eb',
                                        padding: '12px', opacity: isDragging ? 0.4 : 1, transition: 'opacity 0.15s',
                                    }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" onMouseEnter={() => setDraggableIdx(fi)} onMouseLeave={() => setDraggableIdx(null)}
                                            style={{ background: 'none', border: 'none', cursor: 'grab', color: '#d1d5db', padding: '2px', marginTop: '16px', flexShrink: 0 }} title="Drag to reorder">
                                            <GripVertical size={14} />
                                        </button>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '8px' }}>
                                                <div>
                                                    <label style={labelStyle}>{isHeading ? 'Heading Text' : 'Field Name'}</label>
                                                    <input value={field.name} onChange={e => updateField(fi, f => ({ ...f, name: e.target.value }))}
                                                        placeholder={isHeading ? 'Section title' : 'e.g. Leave Type'} style={inputStyleSm} />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Field Type</label>
                                                    <FieldTypePicker value={field.type} onChange={t => applyFieldType(fi, t)} fieldName={field.name} recentTypes={recentFieldTypes}
                                                        suggestion={suggestion} onSuggestionClick={suggestion ? () => applyFieldType(fi, suggestion) : undefined} />
                                                </div>
                                            </div>

                                            {expandedHelpKeys[fi] && (
                                                <div style={{ marginTop: '6px' }}>
                                                    <label style={labelStyle}>Help Text</label>
                                                    <input value={field.helpText || ''} onChange={e => updateField(fi, f => ({ ...f, helpText: e.target.value }))}
                                                        placeholder="Short instruction for the applicant" style={inputStyleSm} autoFocus />
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                                                {!isHeading && (
                                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '11px', color: field.required ? '#1e40af' : '#9ca3af', fontWeight: 500 }}>
                                                        <input type="checkbox" checked={field.required} onChange={e => updateField(fi, f => ({ ...f, required: e.target.checked }))}
                                                            style={{ width: '12px', height: '12px', accentColor: '#2563eb' }} />
                                                        Required
                                                    </label>
                                                )}
                                                <span style={{ flex: 1 }} />
                                                <button type="button" onClick={() => setExpandedHelpKeys(prev => ({ ...prev, [fi]: !prev[fi] }))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px', color: field.helpText ? '#10b981' : '#9ca3af' }}>
                                                    {expandedHelpKeys[fi] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                                    {field.helpText ? 'Help Text' : '+ Help Text'}
                                                </button>
                                                <span style={{ width: '1px', height: '14px', background: '#e5e7eb', margin: '0 2px' }} />
                                                <button type="button" onClick={() => {
                                                    if (field.conditionalLogic) { setExpandedCondIdx(condExpanded ? null : fi); }
                                                    else { updateField(fi, f => ({ ...f, conditionalLogic: { dependsOn: depOptions[0]?.id || '', operator: 'equals', value: '' } })); setExpandedCondIdx(fi); }
                                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px', color: field.conditionalLogic ? '#2563eb' : '#9ca3af' }}>
                                                    {field.conditionalLogic ? (condExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : null}
                                                    {field.conditionalLogic ? 'Condition' : '+ Condition'}
                                                </button>
                                                <span style={{ width: '1px', height: '14px', background: '#e5e7eb' }} />
                                                <button type="button" onClick={() => onFieldsChange([...formFields.slice(0, fi + 1), cloneField(field), ...formFields.slice(fi + 1)])}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'inline-flex', alignItems: 'center', padding: '2px' }} title="Duplicate"><Copy size={13} /></button>
                                                <button type="button" onClick={() => { if (!window.confirm('Remove this field?')) return; onFieldsChange(formFields.filter((_, j) => j !== fi)); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', alignItems: 'center', padding: '2px' }} title="Delete"><Trash2 size={13} /></button>
                                            </div>

                                            {/* Show conditional logic settings */}
                                            {field.conditionalLogic && condExpanded && (
                                                <div style={{ marginTop: '8px', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Show this field when</span>
                                                        <button type="button" onClick={() => { updateField(fi, f => ({ ...f, conditionalLogic: null })); setExpandedCondIdx(null); }}
                                                            style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Remove</button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                                        <select value={field.conditionalLogic.dependsOn} onChange={e => updateField(fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, dependsOn: e.target.value } : null }))} style={inputStyleSm}>
                                                            <option value="">Select field</option>
                                                            {depOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                                        </select>
                                                        <select value={field.conditionalLogic.operator} onChange={e => updateField(fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, operator: e.target.value as NonNullable<BuilderField['conditionalLogic']>['operator'] } : null }))} style={inputStyleSm}>
                                                            <option value="equals">equals</option>
                                                            <option value="not_equals">not equals</option>
                                                            <option value="contains">contains</option>
                                                            <option value="is_empty">is empty</option>
                                                            <option value="not_empty">is not empty</option>
                                                        </select>
                                                        {!['is_empty', 'not_empty'].includes(field.conditionalLogic.operator) ? (
                                                            <input value={field.conditionalLogic.value || ''} onChange={e => updateField(fi, f => ({ ...f, conditionalLogic: f.conditionalLogic ? { ...f.conditionalLogic, value: e.target.value } : null }))} placeholder="Value" style={inputStyleSm} />
                                                        ) : <div style={{ ...inputStyleSm, background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>—</div>}
                                                    </div>
                                                </div>
                                            )}

                                            {field.type === 'select' && (
                                                <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <label style={labelStyle}>Dropdown Options</label>
                                                        <button type="button" onClick={() => updateField(fi, f => ({ ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] }))} style={{ ...btnSmall, color: '#2563eb' }}><Plus size={11} /> Add</button>
                                                    </div>
                                                    {(field.options || []).map((opt, oi) => (
                                                        <div key={`${field.id}-opt-${oi}`} style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                                                            <input value={opt} onChange={e => updateField(fi, f => { const o = [...(f.options || [])]; o[oi] = e.target.value; return { ...f, options: o }; })} style={{ ...inputStyleSm, flex: 1 }} />
                                                            <button type="button" onClick={() => updateField(fi, f => { const o = [...(f.options || [])]; o.splice(oi, 1); return { ...f, options: o }; })} style={{ ...btnSmall, color: '#ef4444', borderColor: '#fecaca' }}><Trash2 size={11} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {field.type === 'paragraph_blanks' && (
                                                <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <label style={{ ...labelStyle, marginBottom: 0 }}>Paragraph Template</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => insertParagraphBlank(field.id, fi)}
                                                            style={{ ...btnSmall, color: '#2563eb' }}
                                                        >
                                                            <Plus size={11} /> Add Blank
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        ref={node => { paragraphTemplateRefs.current[field.id] = node; }}
                                                        value={field.options?.[0] || ''}
                                                        onChange={e => updateField(fi, f => ({ ...f, options: [e.target.value] }))}
                                                        rows={3}
                                                        placeholder="Example: I confirm that [____] joined on [____]."
                                                        style={{ ...inputStyleSm, resize: 'vertical', minHeight: '88px' }}
                                                    />
                                                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#6b7280', lineHeight: 1.5 }}>
                                                        Use <code>[____]</code> anywhere you want a fill-in-the-blank input to appear in the sentence.
                                                    </div>
                                                </div>
                                            )}
                                            {field.type === 'number' && (
                                                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <div><label style={labelStyle}>Min</label><input type="number" value={field.min ?? ''} onChange={e => updateField(fi, f => ({ ...f, min: e.target.value === '' ? undefined : Number(e.target.value) }))} style={inputStyleSm} /></div>
                                                    <div><label style={labelStyle}>Max</label><input type="number" value={field.max ?? ''} onChange={e => updateField(fi, f => ({ ...f, max: e.target.value === '' ? undefined : Number(e.target.value) }))} style={inputStyleSm} /></div>
                                                </div>
                                            )}
                                            {(field.type === 'tuple' || field.type === 'list') && (
                                                <div style={{ marginTop: '10px', padding: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <label style={labelStyle}>{field.type === 'tuple' ? 'Columns' : 'Rows'}</label>
                                                        <button type="button" onClick={() => updateField(fi, f => ({ ...f, subFields: [...(f.subFields || []), { name: '', type: 'text' }] }))} style={{ ...btnSmall, color: '#2563eb' }}><Plus size={11} /> Add</button>
                                                    </div>
                                                    {(field.subFields || []).map((sf, si) => (
                                                        <div key={`${field.id}-subfield-${si}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', alignItems: 'flex-end' }}>
                                                                <div>
                                                                    <label style={{ ...labelStyle, marginBottom: '2px' }}>Column Name</label>
                                                                    <input value={sf.name} onChange={e => updateField(fi, f => { const sfs = [...(f.subFields || [])]; sfs[si] = { ...sfs[si], name: e.target.value }; return { ...f, subFields: sfs }; })} placeholder="e.g. Date" style={inputStyleSm} />
                                                                </div>
                                                                <div>
                                                                    <label style={{ ...labelStyle, marginBottom: '2px' }}>Type</label>
                                                                    <select value={sf.type} onChange={e => updateField(fi, f => { const sfs = [...(f.subFields || [])]; const newType = e.target.value; sfs[si] = { ...sfs[si], type: newType, options: newType === 'select' ? ['Option 1', 'Option 2'] : undefined }; return { ...f, subFields: sfs }; })} style={inputStyleSm}>
                                                                        <option value="text">Text</option>
                                                                        <option value="number">Number</option>
                                                                        <option value="date">Date</option>
                                                                        <option value="date_from_to">Date Range</option>
                                                                        <option value="select">Select</option>
                                                                        <option value="bool">Checkbox</option>
                                                                    </select>
                                                                </div>
                                                                <button type="button" onClick={() => updateField(fi, f => { const sfs = [...(f.subFields || [])]; sfs.splice(si, 1); return { ...f, subFields: sfs }; })} style={{ ...btnSmall, color: '#ef4444', borderColor: '#fecaca' }}><Trash2 size={11} /></button>
                                                            </div>
                                                            {sf.type === 'select' && (
                                                                <div style={{ marginTop: '8px', padding: '10px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                        <label style={labelStyle}>Dropdown Options</label>
                                                                        <button type="button" onClick={() => updateField(fi, f => { const sfs = [...(f.subFields || [])]; sfs[si] = { ...sfs[si], options: [...(sfs[si].options || []), `Option ${(sfs[si].options?.length || 0) + 1}`] }; return { ...f, subFields: sfs }; })} style={{ ...btnSmall, color: '#2563eb' }}><Plus size={11} /> Add</button>
                                                                    </div>
                                                                    {(sf.options || []).map((opt, oi) => (
                                                                        <div key={`${field.id}-subopt-${si}-${oi}`} style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                                                                            <input value={opt} onChange={e => updateField(fi, f => { const sfs = [...(f.subFields || [])]; const newOpts = [...(sfs[si].options || [])]; newOpts[oi] = e.target.value; sfs[si] = { ...sfs[si], options: newOpts }; return { ...f, subFields: sfs }; })} style={{ ...inputStyleSm, flex: 1 }} />
                                                                            <button type="button" onClick={() => updateField(fi, f => { const sfs = [...(f.subFields || [])]; const newOpts = [...(sfs[si].options || [])]; newOpts.splice(oi, 1); sfs[si] = { ...sfs[si], options: newOpts }; return { ...f, subFields: sfs }; })} style={{ ...btnSmall, color: '#ef4444', borderColor: '#fecaca' }}><Trash2 size={11} /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(field.subFields || []).length === 0 && (
                                                        <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>No columns defined. Add one to get started.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                                    <button type="button" onClick={() => onFieldsChange([...formFields.slice(0, fi + 1), createBuilderField(), ...formFields.slice(fi + 1)])}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '4px', transition: 'color 0.15s' }}>
                                        <Plus size={11} /> Add Field Below
                                    </button>
                                </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* ── RIGHT PANEL: Preview ────────────────────────────────────────── */}
            <FormBuilderPreview
                formName={newFormName}
                formDescription={newFormDesc}
                // we wrap our single list of fields into a virtual 'step' 
                // so the preview renderer can show the fields without refactoring it.
                steps={[{ status: 'Form Fields', approval_roles: approvalRoles, fields: formFields }]}
                previewEnabled={previewEnabled}
                previewData={previewData}
                availableRoles={availableRoles}
                onToggle={() => setPreviewEnabled(c => !c)}
                onPreviewDataChange={setPreviewData}
                isMobile={isMobile}
                rightOpen={rightOpen}
                setRightOpen={setRightOpen}
            />
        </div>
    );
}
