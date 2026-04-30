'use client';
// ─── ApplicationDetail ─────────────────────────────────────────────────────────
// Right panel: shows form data, approval timeline, forward panel,
// approve/reject action panel, and PDF download.

import React, { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, XCircle, Upload, ShieldCheck, Loader2, Send, Search, User, ChevronDown, ChevronUp, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Application, Profile, UserSearchResult, getApprovalFields, getSchemaFields, isFieldVisible, formatTitleCase } from '@/types';
import Panel from '../Panel';
import StatusBadge from '../StatusBadge';
import FieldRenderer from '../../ui/FieldRenderer';
import Modal from '../../ui/Modal';

interface Props {
    app: Application;
    canApprove: boolean;
    isInPendingView: boolean;
    profile: Profile | null;
    sigUploading: boolean;
    remarks: string;
    approvalData: Record<string, any>;
    actionLoading: boolean;
    onRemarks: (v: string) => void;
    onApprovalData: (data: Record<string, any>) => void;
    onDecision: (d: 'APPROVED' | 'REJECTED', nextApproverId?: number, nextApproverNote?: string) => Promise<void>;
    onDownloadPdf: (id: number, name: string) => void;
    onSigUpload: (file: File) => void;
    onForward?: (toUserId: number, note: string) => Promise<void>;
    onSearchUsers?: (query: string, formId?: number) => Promise<UserSearchResult[]>;
    isAdmin?: boolean;
    onTabSwitch?: (tab: 'timeline' | 'comments') => void;
    onTogglePanel?: () => void;
    activeTab?: 'timeline' | 'comments';
    panelOpen?: boolean;
    commentCount?: number;
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

function getSubFieldLabel(colKey: string, subFields: any[] | undefined, formatTitleCaseFn: (s: string) => string): string {
    const isFrom = colKey.endsWith('_from');
    const isTo = colKey.endsWith('_to');

    let matchKey = colKey;
    if (isFrom) matchKey = colKey.slice(0, -5);
    else if (isTo) matchKey = colKey.slice(0, -3);

    let targetSf: any = null;
    if (subFields && Array.isArray(subFields)) {
        targetSf = subFields.find(sf =>
            sf && (
                sf.id === matchKey ||
                sf.key === matchKey ||
                (sf.name && sf.name.replace(/\s+/g, '_') === matchKey) ||
                (sf.name && `${sf.name.replace(/\s+/g, '_')}_1` === matchKey)
            )
        );
    }

    let baseLabel = '';
    if (targetSf) {
        baseLabel = targetSf.name || targetSf.label || matchKey;
    } else {
        const parts = matchKey.split('_');
        const num = parseInt(parts[parts.length - 1]);
        if (!isNaN(num)) parts.pop();
        baseLabel = parts.join(' ') || matchKey;
    }

    baseLabel = formatTitleCaseFn(baseLabel || colKey);
    if (isFrom) baseLabel += ' (From)';
    if (isTo) baseLabel += ' (To)';

    return baseLabel;
}

// ─── Forward Panel Component ──────────────────────────────────────────────────
function ForwardPanel({
    onForward,
    onSearchUsers,
    loading,
}: {
    onForward?: (toUserId: number, note: string) => Promise<void>;
    onSearchUsers?: (query: string, formId?: number) => Promise<UserSearchResult[]>;
    loading: boolean;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<UserSearchResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [note, setNote] = useState('');
    const [searching, setSearching] = useState(false);
    const [forwarding, setForwarding] = useState(false);
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

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        setSelectedUser(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.length < 2) {
            setUsers([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            if (!onSearchUsers) return;
            setSearching(true);
            try {
                // Not passing app.id here since this is ForwardPanel which expects basic search, but maybe we should. Let's not for now unless it breaks. Or wait, let's just pass `app?.id` if we had it but ForwardPanel doesn't have app.id. Let's pass undefined.
                const results = await onSearchUsers(query);
                setUsers(results);
                setShowDropdown(true);
            } catch {
                setUsers([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    const handleSelect = (user: UserSearchResult) => {
        setSelectedUser(user);
        setSearchQuery(`${user.name}`);
        setShowDropdown(false);
    };

    const handleForward = async () => {
        if (!selectedUser || !onForward) return;
        setForwarding(true);
        try {
            await onForward(selectedUser.id, note);
            setSelectedUser(null);
            setSearchQuery('');
            setNote('');
        } catch (err) {
            alert('Failed to forward');
        } finally {
            setForwarding(false);
        }
    };

    if (!onForward || !onSearchUsers) return null;

    return (
        <Panel title="Forward to Next Approver">
            {/* User search */}
            <div ref={searchRef} style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    border: '1px solid #d1d5db', borderRadius: '8px',
                    padding: '8px 12px', background: '#fff',
                    transition: 'border-color 0.2s',
                }}>
                    <Search size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    <input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search users by name or email..."
                        style={{
                            flex: 1, border: 'none', outline: 'none',
                            fontSize: '13px', color: '#374151', background: 'transparent',
                        }}
                    />
                    {searching && <Loader2 size={14} className="animate-spin" style={{ color: '#9ca3af' }} />}
                </div>

                {/* Dropdown */}
                {showDropdown && users.length > 0 && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        zIndex: 999, background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '10px', maxHeight: '240px', overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}>
                        {users.map(u => (
                            <div
                                key={u.id}
                                onClick={() => handleSelect(u)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 14px', cursor: 'pointer',
                                    transition: 'background 0.1s',
                                    borderBottom: '1px solid #f3f4f6',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0,
                                }}>
                                    {u.name.charAt(0)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                                        {u.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{u.email}</div>
                                    <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {u.roles.map(role => (
                                            <span key={role} style={{
                                                fontSize: '9px', padding: '1px 6px',
                                                background: '#eff6ff', color: '#1d4ed8',
                                                borderRadius: '4px', fontWeight: 600,
                                                border: '1px solid #bfdbfe',
                                            }}>
                                                {role}
                                            </span>
                                        ))}
                                        {u.department && (
                                            <span style={{
                                                fontSize: '9px', padding: '1px 6px',
                                                background: '#f0fdf4', color: '#15803d',
                                                borderRadius: '4px', fontWeight: 600,
                                                border: '1px solid #bbf7d0',
                                            }}>
                                                {u.department}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {showDropdown && users.length === 0 && !searching && searchQuery.length >= 2 && (
                    <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                        zIndex: 999, background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '10px', padding: '20px', textAlign: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        fontSize: '13px', color: '#9ca3af',
                    }}>
                        No users found
                    </div>
                )}
            </div>

            {/* Selected user preview */}
            {selectedUser && (
                <div style={{
                    padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd',
                    borderRadius: '8px', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                    <User size={16} style={{ color: '#0ea5e9' }} />
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0c4a6e' }}>
                            {selectedUser.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#0369a1' }}>
                            {selectedUser.roles.join(', ')} {selectedUser.department ? `· ${selectedUser.department}` : ''}
                        </div>
                    </div>
                </div>
            )}

            {/* Note */}
            <textarea
                placeholder="Add a note (optional)..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                style={{ ...inputStyle, marginBottom: '12px' }}
            />

            {/* Forward button */}
            <button
                onClick={handleForward}
                disabled={!selectedUser || forwarding || loading}
                style={{
                    width: '100%', padding: '10px', border: 'none',
                    background: selectedUser
                        ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                        : '#e5e7eb',
                    color: selectedUser ? '#fff' : '#9ca3af',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: selectedUser ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: selectedUser ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.2s',
                    opacity: forwarding ? 0.7 : 1,
                }}
            >
                {forwarding ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {forwarding ? 'Forwarding...' : 'Forward'}
            </button>
        </Panel>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplicationDetail({
    app, canApprove, isInPendingView, profile, sigUploading, remarks, approvalData, actionLoading,
    onRemarks, onApprovalData, onDecision, onDownloadPdf, onSigUpload, onForward, onSearchUsers, isAdmin,
    onTabSwitch, onTogglePanel, activeTab, panelOpen, commentCount = 0
}: Props) {
    const isApproved = app.current_status === 'APPROVED';
    const isRejected = app.current_status === 'REJECTED';
    const [showApproveFlow, setShowApproveFlow] = useState(false);
    const [nextApproverQuery, setNextApproverQuery] = useState('');
    const [nextApproverUsers, setNextApproverUsers] = useState<UserSearchResult[]>([]); // live search results (dropdown)
    const [suggestedNextApprovers, setSuggestedNextApprovers] = useState<UserSearchResult[]>([]); // static right-panel list
    const [nextApproverUser, setNextApproverUser] = useState<UserSearchResult | null>(null);
    const [nextApproverNote, setNextApproverNote] = useState('');
    const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);
    const [searchingNextApprover, setSearchingNextApprover] = useState(false);
    const [showNextApproverDropdown, setShowNextApproverDropdown] = useState(false);
    const nextApproverRef = useRef<HTMLDivElement>(null);
    const nextApproverDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardQuery, setForwardQuery] = useState('');
    const [forwardUsers, setForwardUsers] = useState<UserSearchResult[]>([]); // live search results (dropdown)
    const [suggestedForwardUsers, setSuggestedForwardUsers] = useState<UserSearchResult[]>([]); // static right-panel list
    const [selectedForwardUser, setSelectedForwardUser] = useState<UserSearchResult | null>(null);
    const [forwardNote, setForwardNote] = useState('');
    const [searchingForwardUsers, setSearchingForwardUsers] = useState(false);
    const [showForwardDropdown, setShowForwardDropdown] = useState(false);
    const forwardSearchRef = useRef<HTMLDivElement>(null);
    const forwardDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Get schema and extract applicant fields (step "1")
    const formMeta = app.form_data?.__form_meta;
    const schema = formMeta?.schema_definition || app.form_types?.schema_definition || (app.form_types as any)?.schema || {};
    const applicantFields = getSchemaFields(schema);

    // ── Approval workflow tracking ──────────────────────────────────────────
    const requiredRoles: string[] = app.form_types?.approval_rules?.required_roles || [];
    const completedApprovals = (app.form_forwards || []).filter((a: any) => a.action === 'approved' || a.action === 'partially_approved');
    const completedRoles: string[] = completedApprovals.flatMap((a: any) =>
        (a.from_user?.user_roles || []).map((ur: any) => ur.roles?.name).filter(Boolean)
    );
    const pendingRoles = requiredRoles.filter(r => !completedRoles.some(cr => cr === r));
    const alreadyForwardedIds = new Set((app.form_forwards || []).map((f: any) => Number(f.forwarded_to)));
    const currentUserRoles = profile?.roles || [];
    const remainingAfterMe = pendingRoles.filter(r => !currentUserRoles.includes(r));
    const hasPendingRequiredRoles = pendingRoles.length > 0;
    const requiresNextApprover = remainingAfterMe.length > 0;

    // Build form data display (excluding meta)
    const formData = { ...(app.form_data || {}) };
    delete formData.__form_meta;

    useEffect(() => {
        setShowApproveFlow(false);
        setNextApproverQuery('');
        setNextApproverUsers([]);
        setNextApproverUser(null);
        setNextApproverNote('');
        setShowNextApproverDropdown(false);
    }, [app.id]);

    useEffect(() => {
        if (showApproveFlow && onSearchUsers && app.id) {
            // Load STATIC suggested list for right panel (once only)
            onSearchUsers('', app.id).then(results => {
                setSuggestedNextApprovers(results);
            }).catch(() => setSuggestedNextApprovers([]));
            // Reset search dropdown
            setNextApproverUsers([]);
            setShowNextApproverDropdown(false);
            setNextApproverQuery('');
        }
    }, [showApproveFlow, onSearchUsers]);

    useEffect(() => {
        if (showForwardModal && onSearchUsers && app.id) {
            // Load STATIC suggested list for right panel (once only)
            onSearchUsers('', app.id).then(results => {
                setSuggestedForwardUsers(results);
            }).catch(() => setSuggestedForwardUsers([]));
            // Reset search dropdown
            setForwardUsers([]);
            setShowForwardDropdown(false);
            setForwardQuery('');
        }
    }, [showForwardModal, onSearchUsers]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (nextApproverRef.current && !nextApproverRef.current.contains(e.target as Node)) {
                setShowNextApproverDropdown(false);
            }
            if (forwardSearchRef.current && !forwardSearchRef.current.contains(e.target as Node)) {
                setShowForwardDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearchNextApprover = (query: string) => {
        setNextApproverQuery(query);
        setNextApproverUser(null);

        if (nextApproverDebounceRef.current) clearTimeout(nextApproverDebounceRef.current);

        if (!query.trim()) {
            setNextApproverUsers([]);
            setShowNextApproverDropdown(false);
            return;
        }

        if (!onSearchUsers) return;

        nextApproverDebounceRef.current = setTimeout(async () => {
            setSearchingNextApprover(true);
            try {
                // Only updates dropdown results — suggestedNextApprovers (right panel) is NEVER touched
                const results = await onSearchUsers(query);
                
                // Prioritize results where roles match the search query
                const q = query.toLowerCase().trim();
                const sorted = [...results].sort((a, b) => {
                    const aRoleMatch = a.roles?.some(r => r.toLowerCase().includes(q));
                    const bRoleMatch = b.roles?.some(r => r.toLowerCase().includes(q));
                    if (aRoleMatch && !bRoleMatch) return -1;
                    if (!aRoleMatch && bRoleMatch) return 1;
                    
                    const aExactRole = a.roles?.some(r => r.toLowerCase() === q);
                    const bExactRole = b.roles?.some(r => r.toLowerCase() === q);
                    if (aExactRole && !bExactRole) return -1;
                    if (!aExactRole && bExactRole) return 1;
                    
                    return 0;
                });

                setNextApproverUsers(sorted);
                setShowNextApproverDropdown(true);
            } catch {
                setNextApproverUsers([]);
            } finally {
                setSearchingNextApprover(false);
            }
        }, 300);
    };

    const handleSearchForwardUsers = (query: string) => {
        setForwardQuery(query);
        setSelectedForwardUser(null);
        if (forwardDebounceRef.current) clearTimeout(forwardDebounceRef.current);

        if (!query.trim()) {
            setForwardUsers([]);
            setShowForwardDropdown(false);
            return;
        }

        if (!onSearchUsers) return;

        forwardDebounceRef.current = setTimeout(async () => {
            setSearchingForwardUsers(true);
            try {
                // Only updates dropdown results — suggestedForwardUsers (right panel) is NEVER touched
                const results = await onSearchUsers(query);
                
                // Prioritize results where roles match the search query
                const q = query.toLowerCase().trim();
                const sorted = [...results].sort((a, b) => {
                    const aRoleMatch = a.roles?.some(r => r.toLowerCase().includes(q));
                    const bRoleMatch = b.roles?.some(r => r.toLowerCase().includes(q));
                    if (aRoleMatch && !bRoleMatch) return -1;
                    if (!aRoleMatch && bRoleMatch) return 1;
                    
                    const aExactRole = a.roles?.some(r => r.toLowerCase() === q);
                    const bExactRole = b.roles?.some(r => r.toLowerCase() === q);
                    if (aExactRole && !bExactRole) return -1;
                    if (!aExactRole && bExactRole) return 1;
                    
                    return 0;
                });

                setForwardUsers(sorted);
                setShowForwardDropdown(true);
            } catch {
                setForwardUsers([]);
            } finally {
                setSearchingForwardUsers(false);
            }
        }, 300);
    };

    const renderFieldValue = (field: any) => {
        if (field.type === 'date_from_to') {
            const from = formData[`${field.key}_from`];
            const to = formData[`${field.key}_to`];
            const format = (d: string) => {
                if (!d) return '—';
                try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d; }
            };
            return from || to ? `${format(from)} to ${format(to)}` : '—';
        }

        const value = formData[field.key];

        if (typeof value === 'string' && value.includes('/uploads/signatures')) {
            return (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 10px', background: '#ecfdf5', color: '#059669',
                    borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    border: '1px solid #d1fae5'
                }}>
                    <ShieldCheck size={12} /> Digitally Signed
                </div>
            );
        }

        const objectRows = Array.isArray(value)
            ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
            : [];

        if (objectRows.length > 0) {
            const columns = Array.from(new Set(objectRows.flatMap(row => Object.keys(row))));
            return (
                <div style={{ marginTop: '6px', overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr>
                                {columns.map(col => (
                                    <th key={col} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>
                                        {getSubFieldLabel(col, field.subFields, formatTitleCase)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {objectRows.map((row, rIdx) => (
                                <tr key={rIdx} style={{ borderBottom: rIdx === objectRows.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                    {columns.map(col => (
                                        <td key={col} style={{ padding: '6px 8px', color: '#1f2937' }}>
                                            {row[col] === undefined || row[col] === null || row[col] === '' ? '—' : String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (field.type === 'paragraph_blanks') {
            const template = field.options?.[0] || '';
            const blankTokenPattern = /\[_{2,}\]/g;
            const segments = template.split(blankTokenPattern);
            const blankCount = (template.match(blankTokenPattern) || []).length;
            const values = Array.isArray(value) ? value : [];

            return (
                <div style={{
                    lineHeight: '2',
                    fontSize: '14px',
                    color: '#374151',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}>
                    {segments.map((segment: string, idx: number) => (
                        <React.Fragment key={idx}>
                            {segment && <span>{segment}</span>}
                            {idx < blankCount && (
                                <span style={{
                                    display: 'inline-block',
                                    padding: '0 8px',
                                    margin: '0 4px',
                                    borderBottom: '1px solid #1f2937',
                                    fontWeight: 600,
                                    color: '#111827',
                                    minWidth: '40px',
                                    textAlign: 'center',
                                }}>
                                    {values[idx] || ''}
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            );
        }

        if (typeof value === 'object' && value !== null) {
            const entries = Object.entries(value).filter(([_, val]) => val !== '' && val !== null);
            if (entries.length === 0) return '—';

            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 mt-1">
                    {entries.map(([sk, sv]) => (
                        <div key={sk} className="flex flex-col">
                            <span className="text-xs font-medium text-gray-500 uppercase">{getSubFieldLabel(sk, field.subFields, formatTitleCase)}</span>
                            <span className="text-sm text-gray-900">{String(sv)}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return value === undefined || value === null || value === '' ? '—' : String(value);
    };

    const fallbackReviewFields = applicantFields.filter(field => {
        if (field.type === 'heading') return false;

        if (field.type === 'date_from_to') {
            return !formData[`${field.key}_from`] || !formData[`${field.key}_to`];
        }

        return formData[field.key] === undefined || formData[field.key] === null || formData[field.key] === '';
    });

    return (
        <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                        {app.form_types?.name || 'Application'}
                    </h1>
                    {app.reference_number && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px', padding: '4px 10px', background: 'linear-gradient(135deg, #1e40af, #1d4ed8)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
                                {app.reference_number}
                            </span>
                        </div>
                    )}
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        {app.current_status === 'DRAFT' ? 'Last saved ' : ''}
                        {new Date(app.current_status === 'DRAFT' ? app.updated_at : app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {app.current_status === 'APPROVED' && app.office_orders?.order_number && (
                        <div style={{ marginTop: '12px', padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={16} /> Office Order: {app.office_orders.order_number}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <StatusBadge status={app.current_status} lg />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Details Toggle Button */}
                        <button
                            onClick={() => onTogglePanel?.()}
                            style={{
                                padding: '6px 12px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: panelOpen ? '#0f172a' : '#fff',
                                color: panelOpen ? '#fff' : '#64748b',
                                fontSize: '13px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            {panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                            <span>Details</span>
                        </button>

                        {isApproved && (
                            <button
                                onClick={() => onDownloadPdf(app.id, app.form_types?.name || 'Application')}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#1d4ed8'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'}
                            >
                                <FileText size={14} /> Download PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>



            {/* Form Data */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px', marginTop: '20px' }}>
                {/* Applicant data panel */}
                {(() => {
                    const extraEntries = Object.entries(formData).filter(([k]) =>
                        !k.startsWith('__') &&
                        !applicantFields.some(field =>
                            field.key === k ||
                            `${field.key}_from` === k ||
                            `${field.key}_to` === k
                        )
                    );
                    if (applicantFields.length === 0 && extraEntries.length === 0) return null;

                    return (
                        <Panel title="Application Details">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {applicantFields.map((field, idx) => {
                                    if (field.type === 'heading') {
                                        return (
                                            <div key={field.key} style={{ gridColumn: 'span 2', marginTop: idx === 0 ? 0 : '8px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>{field.label}</div>
                                                {field.helpText && <p style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{field.helpText}</p>}
                                            </div>
                                        );
                                    }

                                    const rawValue = field.type === 'date_from_to'
                                        ? `${formData[`${field.key}_from`] || ''}${formData[`${field.key}_to`] || ''}`
                                        : formData[field.key];
                                    const isWide = Array.isArray(rawValue) || (typeof rawValue === 'string' && rawValue.length > 50 && !rawValue.startsWith('/uploads/signatures')) || ['textarea', 'tuple', 'list', 'signature', 'date_from_to', 'paragraph_blanks'].includes(field.type);

                                    return (
                                        <div key={field.key} style={{ gridColumn: isWide ? 'span 2' : 'auto' }}>
                                            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                {field.label}
                                            </div>
                                            {typeof renderFieldValue(field) === 'string'
                                                ? <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{renderFieldValue(field)}</div>
                                                : renderFieldValue(field)}
                                        </div>
                                    );
                                })}
                                {extraEntries.map(([k, v]) => (
                                    <div key={k} style={{ gridColumn: 'span 2' }}>
                                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            {formatTitleCase(k.replace(/_/g, ' '))}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                                            {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v || '—')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    );
                })()}

                {/* Approval data panels */}
                {(app.form_approvals || [])
                    .filter((a: any) => a.decision !== 'PENDING' && a.approval_data && Object.keys(a.approval_data).length > 0)
                    .map((approval: any) => {
                        const approverName = approval.users
                            ? `${approval.users.name}`
                            : 'Unknown';
                        const entries = Object.entries(approval.approval_data).filter(([k]) => !k.startsWith('__'));
                        if (entries.length === 0) return null;

                        return (
                            <Panel key={approval.id} title={`${approval.stage?.replace(/_/g, ' ') || 'Review'} — ${approverName}`}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {entries.map(([k, v], idx) => {
                                        const isWide = Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures'));
                                        return (
                                            <div key={k} style={{ gridColumn: isWide ? 'span 2' : 'auto' }}>
                                                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    {formatTitleCase(k)}
                                                </div>
                                                {typeof v === 'string' && v.includes('/uploads/signatures') ? (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#ecfdf5', color: '#059669', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: '1px solid #d1fae5' }}>
                                                        <ShieldCheck size={12} /> Digitally Signed by {approverName}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                                                        {typeof v === 'object' && v !== null
                                                            ? Object.entries(v).filter(([_, val]) => val !== '' && val !== null).map(([sk, sv]) => `${formatTitleCase(sk)}: ${sv}`).join(' | ') || '—'
                                                            : (v === undefined || v === null || v === '' ? '—' : String(v))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {approval.remarks && (
                                    <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '12px', color: '#6b7280' }}>
                                        <strong>Remarks:</strong> {approval.remarks}
                                    </div>
                                )}
                            </Panel>
                        );
                    })}
            </div>

            {/* Approve / Reject panel */}
            {canApprove && isInPendingView && !isTerminal(app.current_status) && (
                <Panel title="Take Action">
                    {(() => {
                        const explicitApprovalFields = getApprovalFields(
                            schema,
                            [],
                            app.current_status
                        );
                        const approvalFields = explicitApprovalFields.length > 0 ? explicitApprovalFields : fallbackReviewFields;
                        if (approvalFields.length > 0) {
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    {approvalFields.map(f => {
                                        if (!isFieldVisible(f, approvalData)) return null;

                                        if (f.type === 'heading') {
                                            return (
                                                <div key={f.key} style={{ gridColumn: 'span 2', marginTop: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                                                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', margin: 0 }}>{f.label}</h4>
                                                    {f.helpText && <p style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{f.helpText}</p>}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={f.key} style={{ gridColumn: ['textarea', 'tuple', 'list', 'signature'].includes(f.type) || f.label.length > 50 ? 'span 2' : 'auto' }}>
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
                                                    value={f.type === 'date_from_to' ? undefined : approvalData[f.key]}
                                                    fromValue={approvalData[`${f.key}_from`]}
                                                    toValue={approvalData[`${f.key}_to`]}
                                                    onChange={(key, val) => onApprovalData({ ...approvalData, [key]: val })}
                                                    profileSignatureUrl={profile?.signature_url}
                                                    onSignatureUpload={onSigUpload}
                                                    sigUploading={sigUploading}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <textarea placeholder="Remarks (optional)..." value={remarks} onChange={e => onRemarks(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: '14px' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => onDecision('REJECTED')} disabled={actionLoading}
                            style={{ flex: 1, padding: '10px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            {actionLoading ? 'Processing...' : 'Reject'}
                        </button>
                        {onForward && (
                            <button onClick={() => setShowForwardModal(true)} disabled={actionLoading}
                                style={{ flex: 1, padding: '10px', border: '1px solid #d1d5db', background: '#fff', color: '#4b5563', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: actionLoading ? 0.7 : 1 }}>
                                <Send size={14} /> Forward
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                // Validate required approval fields before showing modal
                                const explicitApprovalFields = getApprovalFields(schema, [], app.current_status);
                                const approvalFields = explicitApprovalFields.length > 0 ? explicitApprovalFields : fallbackReviewFields;

                                const missing = approvalFields.filter(f => {
                                    if (!isFieldVisible(f, approvalData) || !f.required) return false;
                                    return !approvalData[f.key];
                                }).map(f => f.label);

                                if (missing.length > 0) {
                                    alert(`Please fill in:\n- ${missing.join('\n- ')}`);
                                    return;
                                }

                                setShowApproveFlow(true);
                            }}
                            disabled={actionLoading}
                            style={{ flex: 1, padding: '10px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)', opacity: actionLoading ? 0.7 : 1 }}>
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            {actionLoading ? 'Approving...' : 'Approve'}
                        </button>
                    </div>
                </Panel>
            )}

            {/* Next Approver Modal — two-column layout */}
            <Modal isOpen={showApproveFlow} onClose={() => setShowApproveFlow(false)} title="Confirm Approval" maxWidth="860px">
                <div style={{ display: 'flex', gap: '24px' }}>
                    {/* LEFT: Workflow Progress */}
                    <div style={{ width: '260px', flexShrink: 0, background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Approval Roles</div>
                        {requiredRoles.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No required roles defined for this form.</div>
                        ) : (
                            requiredRoles.map((role, i) => {
                                const isCompleted = completedRoles.includes(role);
                                const approver = completedApprovals.find((a: any) =>
                                    (a.from_user?.user_roles || []).some((ur: any) => ur.roles?.name === role)
                                );
                                return (
                                    <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: isCompleted ? '#16a34a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                            {isCompleted ? <CheckCircle size={12} color="#fff" /> : <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: isCompleted ? '#15803d' : '#374151' }}>{role.replace(/_/g, ' ')}</div>
                                            {isCompleted && approver?.from_user && (
                                                <div style={{ fontSize: '10px', color: '#64748b' }}>{approver.from_user.name}</div>
                                            )}
                                            {!isCompleted && <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Pending</div>}
                                        </div>
                                    </div>
                                );
                            })
                        )}

                    </div>

                    {/* RIGHT: split into controls (left) + approvers list (right) */}
                    <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
                        {/* Controls: warning + search + selected chip + note + buttons */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {requiresNextApprover && !nextApproverUser && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>Pending Approval Roles</div>
                                        <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>Still needed: <strong>{remainingAfterMe.join(', ')}</strong>. Consider forwarding instead.</div>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Select Next Approver <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                                <div ref={nextApproverRef} style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '9px 12px', background: '#f8fafc' }}>
                                        <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                        <input value={nextApproverQuery} onChange={e => handleSearchNextApprover(e.target.value)} placeholder="Search by name or email..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', background: 'transparent' }} />
                                        {searchingNextApprover && <Loader2 size={13} className="animate-spin" style={{ color: '#3b82f6' }} />}
                                    </div>
                                    {showNextApproverDropdown && nextApproverUsers.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '9px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                                            <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Search Results</div>
                                            {nextApproverUsers.map(u => {
                                                const isDuplicate = alreadyForwardedIds.has(u.id);
                                                return (
                                                    <div key={u.id} onClick={() => { if (!isDuplicate) { setNextApproverUser(u); setNextApproverQuery(u.name); setShowNextApproverDropdown(false); } }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: isDuplicate ? 'not-allowed' : 'pointer', borderBottom: '1px solid #f1f5f9', opacity: isDuplicate ? 0.5 : 1 }}
                                                        onMouseEnter={e => { if (!isDuplicate) e.currentTarget.style.background = '#f8fafc'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                                    >
                                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{u.name.charAt(0)}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{u.name} {isDuplicate && <span style={{ fontSize: '9px', color: '#ef4444' }}>(already forwarded)</span>}</div>
                                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{u.email}</div>
                                                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                {u.roles?.slice(0, 2).map((role: string) => <span key={role} style={{ fontSize: '8px', padding: '1px 4px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '3px', fontWeight: 600 }}>{role}</span>)}
                                                                {u.department && <span style={{ fontSize: '8px', padding: '1px 4px', background: '#f0fdf4', color: '#15803d', borderRadius: '3px', fontWeight: 600 }}>{u.department}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {nextApproverUser && (
                                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1px solid #bbf7d0', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><User size={14} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>{nextApproverUser.name}</div>
                                        <div style={{ fontSize: '11px', color: '#16a34a' }}>{nextApproverUser.email}</div>
                                    </div>
                                    <button onClick={() => { setNextApproverUser(null); setNextApproverQuery(''); }} style={{ background: '#fff', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Note for Next Approver (Optional)</label>
                                <textarea placeholder="Add context for the next reviewer..." value={nextApproverNote} onChange={e => setNextApproverNote(e.target.value)} rows={4} style={{ ...inputStyle, minHeight: '80px', resize: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '9px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setShowApproveFlow(false)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                <button disabled={actionLoading || (requiresNextApprover && !nextApproverUser)} 
                                    onClick={async () => { await onDecision('APPROVED', nextApproverUser?.id, nextApproverNote); setShowApproveFlow(false); }}
                                    title={(requiresNextApprover && !nextApproverUser) ? "You must select a next approver" : ""}
                                    style={{ flex: 2, padding: '10px', borderRadius: '9px', border: 'none', background: (requiresNextApprover && !nextApproverUser) ? '#94a3b8' : 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontWeight: 600, cursor: (actionLoading || (requiresNextApprover && !nextApproverUser)) ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: (requiresNextApprover && !nextApproverUser) ? 'none' : '0 4px 12px rgba(22,163,74,0.25)' }}>
                                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {actionLoading ? 'Processing...' : (requiresNextApprover ? 'Confirm My Approval & Forward' : 'Confirm Approval')}
                                </button>
                            </div>
                        </div>

                        {/* Suggested Approvers — static list, never affected by search */}
                        <div style={{ width: '220px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Approvers</div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
                                {suggestedNextApprovers.length === 0 ? (
                                    <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>No suggestions</div>
                                ) : (
                                    suggestedNextApprovers.map(u => {
                                        const isDuplicate = alreadyForwardedIds.has(u.id);
                                        const isSelected = nextApproverUser?.id === u.id;
                                        return (
                                            <div key={u.id} onClick={() => { if (!isDuplicate) { setNextApproverUser(isSelected ? null : u); setNextApproverQuery(''); setShowNextApproverDropdown(false); } }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', cursor: isDuplicate ? 'not-allowed' : 'pointer', borderBottom: '1px solid #f1f5f9', opacity: isDuplicate ? 0.45 : 1, background: isSelected ? '#f0fdf4' : '#fff', borderLeft: isSelected ? '3px solid #16a34a' : '3px solid transparent' }}
                                                onMouseEnter={e => { if (!isDuplicate && !isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                                            >
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{u.name.charAt(0)}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                        {u.roles?.slice(0, 2).map((role: string) => <span key={role} style={{ fontSize: '8px', padding: '1px 4px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '3px', fontWeight: 600 }}>{role}</span>)}
                                                    </div>
                                                    {isDuplicate && <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>Already forwarded</div>}
                                                </div>
                                                <input type="radio" checked={isSelected} readOnly style={{ accentColor: '#16a34a', flexShrink: 0 }} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Manual Forward Modal — two-column layout */}
            <Modal isOpen={showForwardModal} onClose={() => setShowForwardModal(false)} title="Forward Application" maxWidth="860px">
                <div style={{ display: 'flex', gap: '24px' }}>
                    {/* LEFT: Workflow Progress */}
                    <div style={{ width: '260px', flexShrink: 0, background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Approval Workflow</div>
                        {requiredRoles.length === 0 ? (
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No required roles defined.</div>
                        ) : (
                            requiredRoles.map((role, i) => {
                                const isCompleted = completedRoles.includes(role);
                                const approver = completedApprovals.find((a: any) =>
                                    (a.from_user?.user_roles || []).some((ur: any) => ur.roles?.name === role)
                                );
                                return (
                                    <div key={role} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: isCompleted ? '#16a34a' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                            {isCompleted ? <CheckCircle size={12} color="#fff" /> : <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8' }}>{i + 1}</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: isCompleted ? '#15803d' : '#374151' }}>{role.replace(/_/g, ' ')}</div>
                                            {isCompleted && approver?.from_user && (
                                                <div style={{ fontSize: '10px', color: '#64748b' }}>{approver.from_user.name}</div>
                                            )}
                                            {!isCompleted && <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Pending</div>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* RIGHT: split into controls + list */}
                    <div style={{ flex: 1, display: 'flex', gap: '16px' }}>
                        {/* Controls */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Select User to Forward to <span style={{ color: '#ef4444' }}>*</span></label>
                                <div ref={forwardSearchRef} style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '9px 12px', background: '#f8fafc' }}>
                                        <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                        <input value={forwardQuery} onChange={e => handleSearchForwardUsers(e.target.value)} placeholder="Search by name or email..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b', background: 'transparent' }} />
                                        {searchingForwardUsers && <Loader2 size={13} className="animate-spin" style={{ color: '#3b82f6' }} />}
                                    </div>
                                    {showForwardDropdown && forwardUsers.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '9px', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                                            <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Search Results</div>
                                            {forwardUsers.map(u => {
                                                const isDuplicate = alreadyForwardedIds.has(u.id);
                                                return (
                                                    <div key={u.id} onClick={() => { if (!isDuplicate) { setSelectedForwardUser(u); setForwardQuery(u.name); setShowForwardDropdown(false); } }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: isDuplicate ? 'not-allowed' : 'pointer', borderBottom: '1px solid #f1f5f9', opacity: isDuplicate ? 0.5 : 1 }}
                                                        onMouseEnter={e => { if (!isDuplicate) e.currentTarget.style.background = '#f8fafc'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                                    >
                                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{u.name.charAt(0)}</div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{u.name} {isDuplicate && <span style={{ fontSize: '9px', color: '#ef4444' }}>(already forwarded)</span>}</div>
                                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{u.email}</div>
                                                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                                {u.roles?.slice(0, 2).map((role: string) => <span key={role} style={{ fontSize: '8px', padding: '1px 4px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '3px', fontWeight: 600 }}>{role}</span>)}
                                                                {u.department && <span style={{ fontSize: '8px', padding: '1px 4px', background: '#f0fdf4', color: '#15803d', borderRadius: '3px', fontWeight: 600 }}>{u.department}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {selectedForwardUser && (
                                <div style={{ padding: '10px 12px', background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><User size={14} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af' }}>{selectedForwardUser.name}</div>
                                        <div style={{ fontSize: '11px', color: '#3b82f6' }}>{selectedForwardUser.email}</div>
                                    </div>
                                    <button onClick={() => { setSelectedForwardUser(null); setForwardQuery(''); }} style={{ background: '#fff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>✕</button>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Internal Note (Optional)</label>
                                <textarea placeholder="Reason for forwarding..." value={forwardNote} onChange={e => setForwardNote(e.target.value)} rows={4} style={{ ...inputStyle, minHeight: '80px', resize: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '9px', padding: '9px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setShowForwardModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                                <button disabled={!selectedForwardUser || actionLoading} onClick={async () => { if (onForward) { await onForward(selectedForwardUser!.id, forwardNote); setShowForwardModal(false); } }}
                                    style={{ flex: 2, padding: '10px', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontWeight: 600, cursor: (!selectedForwardUser || actionLoading) ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
                                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    {actionLoading ? 'Forwarding...' : 'Forward Now'}
                                </button>
                            </div>
                        </div>

                        {/* Suggested Users — static list, never affected by search */}
                        <div style={{ width: '220px', flexShrink: 0, border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Suggested Users</div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px' }}>
                                {suggestedForwardUsers.length === 0 ? (
                                    <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>No suggestions</div>
                                ) : (
                                    suggestedForwardUsers.map(u => {
                                        const isDuplicate = alreadyForwardedIds.has(u.id);
                                        const isSelected = selectedForwardUser?.id === u.id;
                                        return (
                                            <div key={u.id} onClick={() => { if (!isDuplicate) { setSelectedForwardUser(isSelected ? null : u); setForwardQuery(''); setShowForwardDropdown(false); } }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', cursor: isDuplicate ? 'not-allowed' : 'pointer', borderBottom: '1px solid #f1f5f9', opacity: isDuplicate ? 0.45 : 1, background: isSelected ? '#eff6ff' : '#fff', borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent' }}
                                                onMouseEnter={e => { if (!isDuplicate && !isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                                            >
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{u.name.charAt(0)}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                                                        {u.roles?.slice(0, 2).map((role: string) => <span key={role} style={{ fontSize: '8px', padding: '1px 4px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '3px', fontWeight: 600 }}>{role}</span>)}
                                                        {u.department && <span style={{ fontSize: '8px', padding: '1px 4px', background: '#f0fdf4', color: '#15803d', borderRadius: '3px', fontWeight: 600 }}>{u.department}</span>}
                                                    </div>
                                                    {isDuplicate && <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: 600 }}>Already forwarded</div>}
                                                </div>
                                                <input type="radio" checked={isSelected} readOnly style={{ accentColor: '#3b82f6', flexShrink: 0 }} />
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </Modal>
        </div>
    );
}
