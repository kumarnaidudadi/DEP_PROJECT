'use client';
// ─── NewApplicationView ────────────────────────────────────────────────────────
// Renders the form-type picker (middle panel) and form-fill panel (right panel).

import React from 'react';
import { ChevronRight, FileText, Plus, Send, Loader2, Upload, Trash2 } from 'lucide-react';
import { FormType, Profile, getSchemaFields } from '@/types';
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

// ── Small helpers ──────────────────────────────────────────────────────────────
function IconBox({ sel, children }: { sel: boolean; children: React.ReactNode }) {
    return (
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: sel ? '#dbeafe' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sel ? '#2563eb' : '#6b7280' }}>
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
    onCancel: () => void;
    onEditFormType: (ft: FormType) => void;
    onDeleteFormType?: (ft: FormType) => void;
    onCreateFormType: () => void;
    onSigUpload: (file: File) => void;
}

export default function NewApplicationView({
    formTypes, searchQuery, selectedFormType, activeFormTypeId, formData, submitting, submitSuccess,
    isAdmin, profile, sigUploading, availableDepartments, availableRoles, liveRoles,
    onSelectFormType, onFormDataChange, onSubmit, onCancel, onEditFormType,
    onDeleteFormType, onCreateFormType, onSigUpload,
}: Props) {
    // activeFormTypeId is used for highlighting in list mode when selectedFormType is null
    const highlightId = selectedFormType?.id ?? activeFormTypeId;

    const handleFieldChange = (key: string, value: any) => {
        onFormDataChange({ ...formData, [key]: value });
    };

    const filteredForms = formTypes.filter(ft =>
        ft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ft.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Middle panel list ──────────────────────────────────────────────────────
    const middlePanel = (
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                {filteredForms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '12px' }}>No forms available</div>
                ) : filteredForms.map(ft => (
                    <ListItem key={ft.id} sel={highlightId === ft.id} onClick={() => {
                        // Pre-fill smart fields
                        const initialData: Record<string, any> = {};
                        const fields = getSchemaFields(ft.schema_definition);
                        fields.forEach(f => {
                            if (f.type === 'department' && profile?.department) initialData[f.key] = profile.department;
                            else if (f.type === 'role' && liveRoles.length > 0) initialData[f.key] = liveRoles[0];
                            else if (f.type === 'date_from_to') {
                                const today = new Date();
                                const tomorrow = new Date(today);
                                tomorrow.setDate(today.getDate() + 1);
                                initialData[`${f.key}_from`] = today.toISOString().split('T')[0];
                                initialData[`${f.key}_to`] = tomorrow.toISOString().split('T')[0];
                            }
                        });
                        onFormDataChange(initialData);
                        onSelectFormType(ft);
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <IconBox sel={selectedFormType?.id === ft.id}><FileText size={14} /></IconBox>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{ft.name}</div>
                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{ft.description || 'Click to fill'}</div>
                            </div>
                        </div>
                        <ChevronRight size={14} style={{ color: '#d1d5db' }} />
                    </ListItem>
                ))}
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
        <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{selectedFormType.name}</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isAdmin && (
                        <button onClick={() => onEditFormType(selectedFormType)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            <FileText size={14} /> Edit Form
                        </button>
                    )}
                    {isAdmin && onDeleteFormType && (
                        <button 
                            onClick={() => {
                                if (window.confirm(`Are you sure you want to completely delete the "${selectedFormType.name}" form?`)) {
                                    onDeleteFormType(selectedFormType);
                                }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            <Trash2 size={14} /> Delete Form
                        </button>
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
                    {fields.map(f => (
                        <div key={f.key} style={{ gridColumn: f.type === 'textarea' || f.type === 'list' ? 'span 2' : 'auto' }}>
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
                            />
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <BtnSecondary onClick={onCancel}>Cancel</BtnSecondary>
                    <BtnPrimary onClick={onSubmit} disabled={submitting}>
                        {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Application</>}
                    </BtnPrimary>
                </div>
            </div>
        </div>
    );

    return <>{rightPanel}</>;
}
