'use client';
// ─── NewApplicationView ────────────────────────────────────────────────────────
// Renders the form-type picker (middle panel) and form-fill panel (right panel).

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, FileText, Plus, Send, Loader2, Upload, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { FormType, Profile, getSchemaFields, buildAutoFillData } from '@/types';
import ListItem from '../ListItem';
import StatusBadge from '../StatusBadge';
import WorkflowProgress from '../WorkflowProgress';
import FieldRenderer from '../../ui/FieldRenderer';
import Panel from '../Panel';

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

function IconBox({ sel, children }: { sel: boolean; children: React.ReactNode }) {
    return (
        <div style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '8px', background: sel ? '#dbeafe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? '#2563eb' : '#6b7280' }}>
            {children}
        </div>
    );
}

function BtnPrimary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{ padding: '10px 24px', border: 'none', background: disabled ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
            {children}
        </button>
    );
}

function BtnSecondary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{ padding: '10px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: 500 }}>
            {children}
        </button>
    );
}

function PremiumToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
    return (
        <div 
            onClick={disabled ? undefined : (e) => { e.stopPropagation(); onChange(); }}
            style={{ 
                width: '42px', 
                height: '22px', 
                borderRadius: '12px', 
                background: checked ? '#10b981' : '#cbd5e1', 
                position: 'relative', 
                cursor: disabled ? 'not-allowed' : 'pointer', 
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                opacity: disabled ? 0.6 : 1,
                boxShadow: checked ? '0 0 8px rgba(16,185,129,0.3)' : 'none'
            }}
        >
            <div style={{ 
                width: '18px', 
                height: '18px', 
                borderRadius: '50%', 
                background: '#fff', 
                position: 'absolute',
                left: checked ? '22px' : '2px',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {checked ? (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                ) : (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                )}
            </div>
        </div>
    );
}

function SuccessMsg() {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span style={{ fontSize: '28px', color: '#16a34a' }}>✓</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937' }}>Application Submitted!</h2>
            <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '13px' }}>Redirecting...</p>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
    formTypes: FormType[];
    searchQuery: string;
    selectedFormType: FormType | null;
    activeFormTypeId?: number | null;
    formData: Record<string, any>;
    submitting: boolean;
    submitSuccess: boolean;
    isAdmin: boolean;
    profile: Profile | null;
    sigUploading: boolean;
    availableDepartments: any[];
    availableRoles: string[];
    liveRoles: string[];
    onSelectFormType: (ft: FormType) => void;
    onFormDataChange: (data: Record<string, any>) => void;
    onSubmit: () => void;
    onSaveDraft?: () => void;
    onCancel: () => void;
    isSavingDraft?: boolean;
    onEditFormType: (ft: FormType) => void;
    onToggleActive?: (ft: FormType) => void;
    adminTab?: 'active' | 'inactive';
    onAdminTabChange?: (tab: 'active' | 'inactive') => void;
    onCreateFormType: () => void;
    onSigUpload: (file: File) => void;
}

export default function NewApplicationView({
    formTypes, searchQuery, selectedFormType, activeFormTypeId, formData, submitting, submitSuccess,
    isAdmin, profile, sigUploading, availableDepartments, availableRoles, liveRoles,
    onSelectFormType, onFormDataChange, onSubmit, onSaveDraft, onCancel, isSavingDraft, onEditFormType,
    onToggleActive, adminTab = 'active', onAdminTabChange, onCreateFormType, onSigUpload,
}: Props) {
    // activeFormTypeId is used for highlighting in list mode when selectedFormType is null
    const highlightId = selectedFormType?.id ?? activeFormTypeId;

    // Tracks which field keys were auto-filled from profile so FieldRenderer can badge them
    const [autoFilledKeys, setAutoFilledKeys] = useState<Set<string>>(new Set());

    const autoFillProcessed = useRef<number | null>(null);

    // Dynamically auto-fill fields once the form is selected and the profile is available
    useEffect(() => {
        if (selectedFormType && profile) {
            // Only autofill if we haven't processed this exact form's ID yet.
            // This prevents an infinite loop triggering when formData is cleared.
            if (autoFillProcessed.current !== selectedFormType.id) {
                const fields = getSchemaFields(selectedFormType.schema_definition);
                const { data, autoFilledKeys: filled } = buildAutoFillData(fields, profile, liveRoles);
                
                setAutoFilledKeys(filled);
                
                // Set the specific form's auto fill data! Wait for render!
                onFormDataChange(data);
                
                autoFillProcessed.current = selectedFormType.id;
            }
        } else {
            // Reset the tracker if the form gets deselected entirely
            autoFillProcessed.current = null;
        }
    }, [selectedFormType, profile, liveRoles, onFormDataChange]);

    const handleFieldChange = (key: string, value: any) => {
        onFormDataChange({ ...formData, [key]: value });
        if (autoFilledKeys.has(key)) {
            const nextKeys = new Set(autoFilledKeys);
            nextKeys.delete(key);
            setAutoFilledKeys(nextKeys);
        }
    };

    const filteredForms = formTypes.filter(ft =>
        ft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ft.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeForms = filteredForms.filter(f => f.is_active !== false);
    const inactiveForms = filteredForms.filter(f => f.is_active === false);
    
    const formsToShow = isAdmin 
        ? (adminTab === 'active' ? activeForms : inactiveForms)
        : activeForms;

    const renderFormList = (forms: FormType[], isInactiveSection = false) => forms.map(ft => (
        <ListItem key={ft.id} sel={highlightId === ft.id} onClick={() => {
            onFormDataChange({}); // Reset any previous form data
            onSelectFormType(ft); // useEffect handles the auto-filling once selected
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: isInactiveSection ? 0.7 : 1, paddingRight: '8px' }}>
                {/* <IconBox sel={selectedFormType?.id === ft.id}><FileText size={16} /></IconBox> */}
                <div style={{ fontSize: '13px', fontWeight: 600, color: ft.is_active === false ? '#64748b' : '#1f2937', lineHeight: '1.5', textTransform: 'capitalize' }}>
                    {ft.name.toLowerCase()}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAdmin && ft.is_active === false && (
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>Hidden</span>
                )}
                <ChevronRight size={14} style={{ color: '#d1d5db' }} />
            </div>
        </ListItem>
    ));

    // ── Middle panel list ──────────────────────────────────────────────────────
    const middlePanel = (
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {isAdmin && (
                <div style={{ padding: '0 18px 12px', display: 'flex', gap: '6px' }}>
                    <button 
                        onClick={() => onAdminTabChange?.('active')} 
                        style={{ 
                            flex: 1, padding: '7px 0', border: 'none', 
                            background: adminTab === 'active' ? '#10b981' : '#f3f4f6', 
                            color: adminTab === 'active' ? '#fff' : '#64748b', 
                            fontSize: '11px', fontWeight: 700, borderRadius: '6px', 
                            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                            textTransform: 'uppercase', letterSpacing: '0.05em' 
                        }}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => onAdminTabChange?.('inactive')} 
                        style={{ 
                            flex: 1, padding: '7px 0', border: 'none', 
                            background: adminTab === 'inactive' ? '#64748b' : '#f3f4f6', 
                            color: adminTab === 'inactive' ? '#fff' : '#64748b', 
                            fontSize: '11px', fontWeight: 700, borderRadius: '6px', 
                            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                            textTransform: 'uppercase', letterSpacing: '0.05em' 
                        }}
                    >
                        Inactive
                    </button>
                </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {formsToShow.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '12px' }}>
                        {isAdmin ? `No ${adminTab} forms found` : 'No forms available'}
                    </div>
                ) : renderFormList(formsToShow, adminTab === 'inactive')}
            </div>
            {isAdmin && (
                <button onClick={onCreateFormType} style={{ position: 'absolute', bottom: '20px', right: '20px', width: '48px', height: '48px', borderRadius: '24px', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59,130,246,0.5)', border: 'none', cursor: 'pointer', zIndex: 10 }}>
                    <Plus size={24} />
                </button>
            )}
        </div>
    );

    // ── Right panel: form fill ─────────────────────────────────────────────────
    if (!selectedFormType) return <>{middlePanel}</>;

    const fields = getSchemaFields(selectedFormType.schema_definition);

    const rightPanel = submitSuccess ? <SuccessMsg /> : (
        <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{selectedFormType.name}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isAdmin && (
                        <button onClick={() => onEditFormType(selectedFormType)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            <FileText size={14} /> Edit Form
                        </button>
                    )}
                    {isAdmin && onToggleActive && (
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                background: selectedFormType.is_active === false ? '#f8fafc' : '#f0fdf4', 
                                padding: '6px 16px', 
                                borderRadius: '12px', 
                                border: `1px solid ${selectedFormType.is_active === false ? '#e2e8f0' : '#bbf7d0'}`,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <span style={{ 
                                fontSize: '11px', 
                                fontWeight: 800, 
                                color: selectedFormType.is_active === false ? '#64748b' : '#059669',
                                textTransform: 'uppercase',
                                letterSpacing: '0.02em',
                                minWidth: '55px'
                            }}>
                                {selectedFormType.is_active === false ? 'Inactive' : 'Active'}
                            </span>
                            <PremiumToggle 
                                checked={selectedFormType.is_active !== false} 
                                onChange={() => onToggleActive(selectedFormType)} 
                            />
                        </div>
                    )}
                </div>
            </div>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px' }}>{selectedFormType.description || 'Fill in the details below.'}</p>

            {/* Workflow preview */}
            {selectedFormType.workflow && selectedFormType.workflow.steps.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #ecfeff 100%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                        <div style={{ width: '4px', height: '14px', borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #2563eb)' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Approval Workflow</span>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginLeft: 'auto' }}>{selectedFormType.workflow.steps.length} steps</span>
                    </div>
                    <WorkflowProgress steps={selectedFormType.workflow.steps} />
                </div>
            )}

            {/* Form fields */}
            <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {fields.map((f, idx) => {
                        const uniqueKey = `${f.key}_${idx}`;
                        if (f.type === 'heading') {
                            return (
                                <div key={uniqueKey} style={{ gridColumn: 'span 2', marginTop: '16px', marginBottom: '8px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{f.label}</h3>
                                </div>
                            );
                        }

                        return (
                            <div key={uniqueKey} style={{ gridColumn: ['textarea', 'list', 'tuple', 'date_from_to', 'signature', 'name'].includes(f.type) || f.label.length > 50 ? 'span 2' : 'auto' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                                    {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>
                                <FieldRenderer
                                    field={f}
                                    value={f.type === 'date_from_to' ? undefined : formData[f.key]}
                                    fromValue={formData[`${f.key}_from`]}
                                    toValue={formData[`${f.key}_to`]}
                                    onChange={handleFieldChange}
                                    profileSignatureUrl={profile?.signature_url}
                                    onSignatureUpload={onSigUpload}
                                    sigUploading={sigUploading}
                                    availableDepartments={availableDepartments}
                                    availableRoles={availableRoles}
                                    isAutoFilled={autoFilledKeys.has(f.key)}
                                />
                            </div>
                        );
                    })}
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
                    {onSaveDraft && (
                        <button 
                            onClick={onSaveDraft} 
                            disabled={isSavingDraft || submitting}
                            style={{ 
                                padding: '10px 20px', 
                                border: '1px solid #3b82f6', 
                                background: '#eff6ff', 
                                borderRadius: '8px', 
                                fontSize: '13px', 
                                color: '#2563eb', 
                                cursor: (isSavingDraft || submitting) ? 'not-allowed' : 'pointer', 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {isSavingDraft ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                            Save as Draft
                        </button>
                    )}
                    <BtnPrimary onClick={onSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Application</>}
                    </BtnPrimary>
                </div>
            </div>
        </div>
    );

    return <>{rightPanel}</>;
}
