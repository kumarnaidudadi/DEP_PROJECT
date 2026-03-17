'use client';
// ─── ApplicationDetail ─────────────────────────────────────────────────────────
// Right panel: shows form data grouped by steps, workflow progress,
// approve/reject action panel, and PDF download.

import React from 'react';
import { FileText, CheckCircle, XCircle, Upload } from 'lucide-react';
import { Application, Profile, getApprovalFields } from '@/types';
import Panel from '../Panel';
import StatusBadge from '../StatusBadge';
import WorkflowProgress from '../WorkflowProgress';
import FieldRenderer from '../../ui/FieldRenderer';

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
    onDecision: (d: 'APPROVED' | 'REJECTED') => void;
    onDownloadPdf: (id: number, name: string) => void;
    onSigUpload: (file: File) => void;
    isAdmin?: boolean;
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
    fontSize: '13px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    color: '#1f2937', background: '#ffffff',
};

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function ApplicationDetail({
    app, canApprove, isInPendingView, profile, sigUploading,
    remarks, approvalData, actionLoading,
    onRemarks, onApprovalData, onDecision, onDownloadPdf, onSigUpload, isAdmin
}: Props) {
    const isApproved = app.current_status === 'APPROVED';
    const isRejected = app.current_status === 'REJECTED';
    const steps = app.form_types?.workflow?.steps || [];

    return (
        <div style={{ padding: '32px 40px', maxWidth: '700px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                        {app.form_types?.name || 'Application'} #{app.id}
                    </h1>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        {app.users ? `${app.users.first_name} ${app.users.last_name}` : ''}
                        {' · '}{new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <StatusBadge status={app.current_status} lg />
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

            {/* Workflow progress */}
            {steps.length > 0 && (
                <Panel title="Workflow Progress">
                    <WorkflowProgress steps={steps} currentStatus={app.current_status} isApproved={isApproved} isRejected={isRejected} />
                </Panel>
            )}

            {/* Form data grouped by steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                {(() => {
                    const panels: React.ReactNode[] = [];
                    const schema = app.form_types?.schema_definition || {};
                    const stepsKeys = Object.keys(schema).sort((a, b) => Number(a) - Number(b));
                    const renderedFields = new Set<string>();

                    stepsKeys.forEach(stepKey => {
                        const stepConfig = schema[stepKey];
                        if (!Array.isArray(stepConfig) || stepConfig.length === 0) return;
                        const statusObj = stepConfig[0] || {};
                        const panelTitle = statusObj.status === 'Draft' ? 'Applicant' : statusObj.status;

                        let sourceData: any = {};
                        if (stepKey === '1' || statusObj.status === 'Draft') {
                            sourceData = app.form_data || {};
                        } else {
                            const approval = (app.form_approvals || []).find((a: any) => a.stage === statusObj.status && a.decision === 'APPROVED');
                            if (approval?.approval_data) sourceData = approval.approval_data;
                        }

                        const fieldsInStep = stepConfig.slice(1).map((f: any) => {
                            const normalizedName = f.name?.replace(/\s+/g, '_');
                            if (!normalizedName) return [];
                            if (f.type === 'date_from_to') {
                                return [
                                    { key: `${normalizedName}_from`, value: sourceData[`${normalizedName}_from`] },
                                    { key: `${normalizedName}_to`, value: sourceData[`${normalizedName}_to`] },
                                ];
                            }
                            return [{ key: normalizedName, value: sourceData[normalizedName] }];
                        }).flat().filter((obj: any) => obj.key && obj.value !== undefined && obj.value !== '');

                        if (fieldsInStep.length > 0) {
                            fieldsInStep.forEach((f: any) => renderedFields.add(f.key));
                            panels.push(
                                <Panel key={`step-${stepKey}`} title={panelTitle} style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                        {fieldsInStep.map((f: any) => {
                                            const { key: k, value: v } = f;
                                            const isWide = Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures'));
                                            return (
                                                <div key={k} style={{ gridColumn: isWide ? 'span 2' : 'auto' }}>
                                                    <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.replace(/_/g, ' ')}</div>
                                                    {typeof v === 'string' && v.startsWith('/uploads/signatures') ? (
                                                        <img src={`http://localhost:4000${v}`} alt="Signature" style={{ maxHeight: '60px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#fff', padding: '4px' }} />
                                                    ) : Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' ? (
                                                        <div style={{ marginTop: '6px', overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                <thead style={{ background: '#f9fafb' }}>
                                                                    <tr>{Object.keys(v[0]).map(col => <th key={col} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</th>)}</tr>
                                                                </thead>
                                                                <tbody>
                                                                    {v.map((row: any, idx: number) => (
                                                                        <tr key={idx} style={{ borderBottom: idx === v.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                            {Object.values(row).map((cell: any, cIdx: number) => <td key={cIdx} style={{ padding: '6px 8px' }}>{String(cell || '—')}</td>)}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{String(v) || '—'}</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Panel>
                            );
                        }
                    });

                    // Unmapped fields
                    const unmapped = Object.entries(app.form_data || {}).filter(([k, v]) => !renderedFields.has(k) && v !== '' && v !== null);
                    if (unmapped.length > 0) {
                        panels.push(
                            <Panel key="unmapped" title="Other Details" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {unmapped.map(([k, v]) => (
                                        <div key={k} style={{ gridColumn: (Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures'))) ? 'span 2' : 'auto' }}>
                                            <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{k.replace(/_/g, ' ')}</div>
                                            <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>{String(v) || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        );
                    }

                    return panels;
                })()}
            </div>

            {/* Approve / Reject panel */}
            {canApprove && isInPendingView && !isTerminal(app.current_status) && (
                <Panel title="Take Action">
                    {(() => {
                        const approvalFields = getApprovalFields(
                            app.form_types?.schema_definition || {},
                            steps,
                            app.current_status
                        );
                        if (approvalFields.length > 0) {
                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    {approvalFields.map(f => (
                                        <div key={f.key} style={{ gridColumn: ['textarea', 'tuple', 'list', 'signature'].includes(f.type) ? 'span 2' : 'auto' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '5px' }}>
                                                {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                                            </label>
                                            <FieldRenderer
                                                field={f}
                                                value={approvalData[f.key]}
                                                onChange={(key, val) => onApprovalData({ ...approvalData, [key]: val })}
                                                profileSignatureUrl={profile?.signature_url}
                                                onSignatureUpload={onSigUpload}
                                                sigUploading={sigUploading}
                                            />
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                        return null;
                    })()}
                    <textarea placeholder="Remarks (optional)..." value={remarks} onChange={e => onRemarks(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: '14px' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => onDecision('REJECTED')} disabled={actionLoading}
                            style={{ flex: 1, padding: '10px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <XCircle size={14} /> Reject
                        </button>
                        <button onClick={() => onDecision('APPROVED')} disabled={actionLoading}
                            style={{ flex: 1, padding: '10px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                            <CheckCircle size={14} /> Approve
                        </button>
                    </div>
                </Panel>
            )}
        </div>
    );
}
