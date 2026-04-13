'use client';
// ─── NewApplicationView ────────────────────────────────────────────────────────
// Renders the form-type picker (middle panel) and form-fill panel (right panel).

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, FileText, Plus, Send, Loader2, Upload, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { FormType, Profile, getSchemaFields, buildAutoFillData, isFieldVisible, UserSearchResult } from '@/types';
import ListItem from '../ListItem';
import StatusBadge from '../StatusBadge';
import { Search, User } from 'lucide-react';

import FieldRenderer from '../../ui/FieldRenderer';
import Panel from '../Panel';
import Modal from '../../ui/Modal';

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
    onSubmit: (toUserId: number, note: string) => void;
    onSearchUsers: (query: string) => Promise<UserSearchResult[]>;
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
    onSelectFormType, onFormDataChange, onSubmit, onSearchUsers, onSaveDraft, onCancel, isSavingDraft, onEditFormType,
    onToggleActive, adminTab = 'active', onAdminTabChange, onCreateFormType, onSigUpload,
}: Props) {
    // activeFormTypeId is used for highlighting in list mode when selectedFormType is null
    const highlightId = selectedFormType?.id ?? activeFormTypeId;

    // Tracks which field keys were auto-filled from profile so FieldRenderer can badge them
    const [autoFilledKeys, setAutoFilledKeys] = useState<Set<string>>(new Set());

    const autoFillProcessed = useRef<number | null>(null);
    const [showApprovalStep, setShowApprovalStep] = useState(false);

    // ── Recipient selection state ──
    const [recipientQuery, setRecipientQuery] = useState('');
    const [foundUsers, setFoundUsers] = useState<UserSearchResult[]>([]);
    const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
    const [submissionNote, setSubmissionNote] = useState('');
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        setShowApprovalStep(false);
        setRecipientQuery('');
        setFoundUsers([]);
        setSelectedRecipient(null);
        setSubmissionNote('');
        setShowDropdown(false);
    }, [selectedFormType?.id]);

    const handleUserSearch = (query: string) => {
        setRecipientQuery(query);
        setSelectedRecipient(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.length < 2) { setFoundUsers([]); setShowDropdown(false); return; }

        debounceRef.current = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const results = await onSearchUsers(query);
                setFoundUsers(results); setShowDropdown(true);
            } finally { setSearchingUsers(false); }
        }, 300);
    };

    const handleSelectRecipient = (u: UserSearchResult) => {
        setSelectedRecipient(u);
        setRecipientQuery(u.name);
        setShowDropdown(false);
    };

    const validateFormFields = (fieldsToValidate: ReturnType<typeof getSchemaFields>) => {
        const missing = fieldsToValidate.filter(f => {
            if (!isFieldVisible(f, formData) || !f.required) return false;
            if (f.type === 'date_from_to') return !formData[`${f.key}_from`] || !formData[`${f.key}_to`];
            return !formData[f.key];
        }).map(f => f.label);

        if (missing.length > 0) {
            alert(`Please fill in:\n- ${missing.join('\n- ')}`);
            return false;
        }

        return true;
    };

    const handleFinalSubmit = (fieldsToValidate: ReturnType<typeof getSchemaFields>) => {
        if (!validateFormFields(fieldsToValidate)) return;
        setShowApprovalStep(true);
    };

    // Dynamically auto-fill fields once the form is selected and the profile is available
    useEffect(() => {
        if (selectedFormType && profile) {
            // Only autofill if we haven't processed this exact form's ID yet.
            // This prevents an infinite loop triggering when formData is cleared.
            if (autoFillProcessed.current !== selectedFormType.id) {
                const fields = getSchemaFields((selectedFormType as any).schema_definition ?? (selectedFormType as any).schema ?? {});
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

    const fields = getSchemaFields((selectedFormType as any).schema_definition ?? (selectedFormType as any).schema ?? {});

    const rightPanel = submitSuccess ? <SuccessMsg /> : (
        <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => onEditFormType(selectedFormType)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            <FileText size={14} /> Edit Form
                        </button>
                        {onToggleActive && (
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
            )}

            {/* Approval rules preview */}
            {showApprovalStep && selectedFormType.approval_rules && (selectedFormType.approval_rules as any)?.required_roles?.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #ecfeff 100%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ width: '4px', height: '14px', borderRadius: '2px', background: 'linear-gradient(180deg, #3b82f6, #2563eb)' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Required Approvals</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {((selectedFormType.approval_rules as any)?.required_roles || []).map((role: string) => (
                            <span key={role} style={{ fontSize: '11px', fontWeight: 600, background: '#dbeafe', color: '#1e40af', padding: '3px 10px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
                                {role}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Form fields */}
            <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {fields.map((f, idx) => {
                        const uniqueKey = `${f.key}_${idx}`;
                        if (!isFieldVisible(f, formData)) return null;

                        if (f.type === 'heading') {
                            return (
                                <div key={uniqueKey} style={{ gridColumn: 'span 2', marginTop: '16px', marginBottom: '8px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>{f.label}</h3>
                                    {f.helpText && <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{f.helpText}</p>}
                                </div>
                            );
                        }

                        return (
                            <div key={uniqueKey} style={{ gridColumn: ['textarea', 'list', 'tuple', 'date_from_to', 'signature', 'name', 'paragraph_blanks'].includes(f.type) || f.label.length > 50 ? 'span 2' : 'auto' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                                    {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>
                                {f.helpText && (
                                    <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                                        {f.helpText}
                                    </p>
                                )}
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
                    <BtnPrimary onClick={() => handleFinalSubmit(fields)} disabled={submitting}>
                        {submitting
                            ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                            : <><Send size={14} /> Submit Application</>}
                    </BtnPrimary>
                </div>
            </div>

            {/* Approval Step Modal */}
            <Modal
                isOpen={showApprovalStep}
                onClose={() => setShowApprovalStep(false)}
                title="Forward for Approval"
                maxWidth="550px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div ref={searchRef} style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                            Search Approver (Name or Email) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            border: '1px solid #e2e8f0', borderRadius: '12px',
                            padding: '12px 16px', background: '#f8fafc',
                            transition: 'all 0.2s ease',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                        }}>
                            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <input
                                value={recipientQuery}
                                onChange={e => handleUserSearch(e.target.value)}
                                placeholder="Type name or email..."
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#1e293b', background: 'transparent' }}
                            />
                            {searchingUsers && <Loader2 size={16} className="animate-spin" style={{ color: '#3b82f6' }} />}
                        </div>

                        {showDropdown && foundUsers.length > 0 && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
                                zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: '12px', maxHeight: '240px', overflowY: 'auto',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                padding: '4px',
                            }}>
                                {foundUsers.map(u => (
                                    <div key={u.id} onClick={() => handleSelectRecipient(u)} 
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '12px', 
                                            padding: '10px 12px', cursor: 'pointer', borderRadius: '8px',
                                            transition: 'all 0.2s', borderBottom: '1px solid #f8fafc' 
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700 }}>
                                            {u.name.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{u.name}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected recipient preview */}
                    {selectedRecipient && (
                        <div style={{
                            padding: '16px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                            border: '1px solid #bae6fd', borderRadius: '14px',
                            display: 'flex', alignItems: 'center', gap: '14px',
                            animation: 'modalEnter 0.3s ease-out'
                        }}>
                            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 6px -1px rgba(14, 165, 233, 0.2)' }}>
                                <User size={20} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0369a1' }}>{selectedRecipient.name}</div>
                                <div style={{ fontSize: '12px', color: '#0ea5e9', fontWeight: 500 }}>{selectedRecipient.email}</div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    {selectedRecipient.roles.map(role => (
                                        <span key={role} style={{ fontSize: '10px', background: '#fff', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bae6fd', fontWeight: 600 }}>{role}</span>
                                    ))}
                                </div>
                            </div>
                            <button type="button" onClick={() => { setSelectedRecipient(null); setRecipientQuery(''); }} 
                                style={{ background: '#fff', border: '1px solid #bae6fd', color: '#0284c7', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                Change
                            </button>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Notes (Optional)</label>
                        <textarea
                            placeholder="Add a message for the approver..."
                            value={submissionNote}
                            onChange={e => setSubmissionNote(e.target.value)}
                            rows={3}
                            style={{ 
                                ...inputStyle, 
                                minHeight: '80px', 
                                resize: 'none',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '12px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button 
                            onClick={() => setShowApprovalStep(false)}
                            style={{ 
                                flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', 
                                background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer',
                                fontSize: '14px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!selectedRecipient || submitting}
                            onClick={() => onSubmit(selectedRecipient!.id, submissionNote)}
                            style={{ 
                                flex: 2, padding: '12px', borderRadius: '12px', border: 'none', 
                                background: !selectedRecipient || submitting ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                                color: '#fff', fontWeight: 600, cursor: !selectedRecipient || submitting ? 'not-allowed' : 'pointer',
                                fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: !selectedRecipient || submitting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {submitting ? 'Submitting...' : 'Confirm & Submit'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );

    return <>{rightPanel}</>;
}
