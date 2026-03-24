'use client';
// ─── ApplicationDetail ─────────────────────────────────────────────────────────
// Right panel: shows form data grouped by steps, workflow progress,
// approve/reject action panel, and PDF download.

import React from 'react';
import { FileText, CheckCircle, XCircle, Upload, ShieldCheck, Loader2 } from 'lucide-react';
import { Application, Profile, getApprovalFields, isFieldVisible, formatTitleCase } from '@/types';
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

function normalizeStageName(value: string | undefined | null): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function getStepFieldCandidates(field: any, fieldIndex: number): string[] {
    const normalizedName = field?.name?.replace(/\s+/g, '_');
    const candidates = [
        field?.id,
        normalizedName ? `${normalizedName}_${fieldIndex}` : null,
        normalizedName,
    ];

    return candidates.filter((candidate): candidate is string => Boolean(candidate));
}

function collectExpectedStepKeys(stepConfig: any[]): Set<string> {
    const keys = new Set<string>();
    let fieldCounter = 0;

    stepConfig.slice(1).forEach((field: any) => {
        if (!field?.name || field.type === 'heading') return;

        fieldCounter++;
        const candidates = getStepFieldCandidates(field, fieldCounter);
        candidates.forEach(candidate => keys.add(candidate));

        if (field.type === 'date_from_to') {
            candidates.forEach(candidate => {
                keys.add(`${candidate}_from`);
                keys.add(`${candidate}_to`);
            });
        }
    });

    return keys;
}

function pickStepData(stepConfig: any[], source: any): Record<string, any> {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

    const picked: Record<string, any> = {};
    let fieldCounter = 0;

    stepConfig.slice(1).forEach((field: any) => {
        if (!field?.name || field.type === 'heading') return;

        fieldCounter++;
        const candidates = getStepFieldCandidates(field, fieldCounter);

        candidates.forEach(candidate => {
            if (source[candidate] !== undefined) {
                picked[candidate] = source[candidate];
            }
        });

        if (field.type === 'date_from_to') {
            candidates.forEach(candidate => {
                const fromKey = `${candidate}_from`;
                const toKey = `${candidate}_to`;
                if (source[fromKey] !== undefined) picked[fromKey] = source[fromKey];
                if (source[toKey] !== undefined) picked[toKey] = source[toKey];
            });
        }
    });

    return picked;
}

function resolveApprovalForStep(app: Application, stepConfig: any[], status: string) {
    const completedApprovals = (app.form_approvals || []).filter((approval: any) => approval?.decision !== 'PENDING');
    const normalizedStatus = normalizeStageName(status);
    const exactMatch = completedApprovals.find(
        (approval: any) => normalizeStageName(approval?.stage) === normalizedStatus
    );

    if (exactMatch) return exactMatch;

    const looseMatch = completedApprovals.find((approval: any) => {
        const normalizedStage = normalizeStageName(approval?.stage);
        return normalizedStage && normalizedStatus &&
            (normalizedStage.includes(normalizedStatus) || normalizedStatus.includes(normalizedStage));
    });

    if (looseMatch) return looseMatch;

    const expectedKeys = collectExpectedStepKeys(stepConfig);
    let bestMatch: any = null;
    let bestScore = 0;

    completedApprovals.forEach((approval: any) => {
        const approvalData = approval?.approval_data;
        if (!approvalData || typeof approvalData !== 'object' || Array.isArray(approvalData)) return;

        const score = Object.keys(approvalData).reduce((total, key) => {
            return total + (expectedKeys.has(key) ? 1 : 0);
        }, 0);

        if (score > bestScore) {
            bestScore = score;
            bestMatch = approval;
        }
    });

    return bestScore > 0 ? bestMatch : null;
}

function inferFieldType(value: any): string {
    if (typeof value === 'string' && value.includes('/uploads/signatures')) return 'signature';
    if (typeof value === 'boolean') return 'bool';
    if (Array.isArray(value)) return 'list';
    if (value && typeof value === 'object') return 'tuple';
    return 'text';
}

function buildInferredField(key: string, value: any) {
    return {
        id: key,
        name: formatTitleCase(key),
        type: inferFieldType(value),
        required: false,
    };
}

function getCurrentFormDefinition(app: Application) {
    const formMeta = app.form_data?.__form_meta;
    const hasSnapshotSchema = formMeta?.schema_definition && typeof formMeta.schema_definition === 'object';
    const hasSnapshotSteps = Array.isArray(formMeta?.workflow_steps) && formMeta.workflow_steps.length > 0;

    return {
        schema: hasSnapshotSchema ? formMeta.schema_definition : (app.form_types?.schema_definition || {}),
        steps: hasSnapshotSteps ? formMeta.workflow_steps : (app.form_types?.workflow?.steps || []),
        hasSnapshot: Boolean(hasSnapshotSchema && hasSnapshotSteps),
    };
}

function buildDisplayFormDefinition(app: Application) {
    const current = getCurrentFormDefinition(app);
    if (current.hasSnapshot) return current;

    const completedApprovals = (app.form_approvals || [])
        .filter((approval: any) => approval?.decision !== 'PENDING')
        .sort((a: any, b: any) => {
            const aTime = new Date(a?.decided_at || 0).getTime();
            const bTime = new Date(b?.decided_at || 0).getTime();
            if (aTime !== bTime) return aTime - bTime;
            return (a?.id || 0) - (b?.id || 0);
        });

    if (completedApprovals.length === 0) {
        return current;
    }

    const schema: Record<string, any[]> = {};
    const steps: any[] = [];
    const currentSchema = current.schema || {};
    const currentSteps = current.steps || [];

    if (Array.isArray(currentSchema['1']) && currentSchema['1'].length > 0) {
        schema['1'] = currentSchema['1'];
    }

    const draftStep = currentSteps.find((step: any) => String(step?.step_name || '').toLowerCase() === 'draft');
    if (draftStep) {
        steps.push(draftStep);
    } else if (schema['1']) {
        steps.push({ id: 'draft', step_order: 1, step_name: 'Draft', approval_roles: [], is_terminal: false });
    }

    completedApprovals.forEach((approval: any, index: number) => {
        const matchedCurrentStepKey = Object.keys(currentSchema).find((key) => {
            const status = currentSchema[key]?.[0]?.status;
            return normalizeStageName(status) === normalizeStageName(approval.stage);
        });
        const matchedCurrentStep = currentSteps.find((step: any) =>
            normalizeStageName(step?.step_name) === normalizeStageName(approval.stage)
        );

        const baseStepConfig = matchedCurrentStepKey && Array.isArray(currentSchema[matchedCurrentStepKey])
            ? currentSchema[matchedCurrentStepKey]
            : [{ status: approval.stage }];
        const baseFields = baseStepConfig.slice(1);
        const knownKeys = new Set<string>();
        let fieldCounter = 0;

        baseFields.forEach((field: any) => {
            if (!field?.name || field.type === 'heading') return;
            fieldCounter++;
            getStepFieldCandidates(field, fieldCounter).forEach((candidate) => knownKeys.add(candidate));
        });

        const extraFields: any[] = [];
        Object.entries(approval?.approval_data || {}).forEach(([key, value]) => {
            if (key.startsWith('__') || knownKeys.has(key)) return;
            extraFields.push(buildInferredField(key, value));
        });

        const stepConfig = [
            { status: approval.stage },
            ...baseFields,
            ...extraFields,
        ];

        const stepOrder = index + 2;
        schema[String(stepOrder)] = stepConfig;
        steps.push(
            matchedCurrentStep
                ? { ...matchedCurrentStep, step_order: stepOrder, step_name: approval.stage }
                : { id: `approval-${approval.id}`, step_order: stepOrder, step_name: approval.stage, approval_roles: [], is_terminal: index === completedApprovals.length - 1 }
        );
    });

    return { schema, steps, hasSnapshot: false };
}

function getSubFieldLabel(colKey: string, subFields: any[] | undefined, formatTitleCaseFn: (s: string) => string): string {
    const isFrom = colKey.endsWith('_from');
    const isTo = colKey.endsWith('_to');
    
    let matchKey = colKey;
    if (isFrom) matchKey = colKey.slice(0, -5);
    else if (isTo) matchKey = colKey.slice(0, -3);

    let targetSf: any = null;
    if (subFields && Array.isArray(subFields)) {
        targetSf = subFields.find(sf => 
            sf.id === matchKey || 
            sf.key === matchKey ||
            sf.name?.replace(/\s+/g,'_') === matchKey || 
            `${sf.name?.replace(/\s+/g,'_')}_1` === matchKey
        );
    }
    
    let baseLabel = '';
    if (targetSf) {
        baseLabel = targetSf.name;
    } else {
        const parts = matchKey.split('_');
        const num = parseInt(parts[parts.length - 1]);
        if (!isNaN(num)) parts.pop();
        baseLabel = parts.join(' ');
    }
    
    baseLabel = formatTitleCaseFn(baseLabel);
    if (isFrom) baseLabel += ' (From)';
    if (isTo) baseLabel += ' (To)';
    
    return baseLabel;
}

export default function ApplicationDetail({
    app, canApprove, isInPendingView, profile, sigUploading,
    remarks, approvalData, actionLoading,
    onRemarks, onApprovalData, onDecision, onDownloadPdf, onSigUpload, isAdmin
}: Props) {
    const isApproved = app.current_status === 'APPROVED';
    const isRejected = app.current_status === 'REJECTED';
    const { schema: displaySchema, steps: displaySteps } = buildDisplayFormDefinition(app);
    const { schema: actionSchema, steps: actionSteps } = getCurrentFormDefinition(app);

    return (
        <div style={{ padding: '32px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>
                        {app.form_types?.name || 'Application'}
                    </h1>
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
            {displaySteps.length > 0 && (
                <Panel title="Workflow Progress">
                    <WorkflowProgress steps={displaySteps} currentStatus={app.current_status} isApproved={isApproved} isRejected={isRejected} />
                </Panel>
            )}

            {/* Form data grouped by steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                {(() => {
                    const panels: React.ReactNode[] = [];
                    const stepsKeys = Object.keys(displaySchema).sort((a, b) => Number(a) - Number(b));
                    const renderedFields = new Set<string>();

                    stepsKeys.forEach(stepKey => {
                        const stepConfig = displaySchema[stepKey];
                        if (!Array.isArray(stepConfig) || stepConfig.length === 0) return;
                        const statusObj = stepConfig[0] || {};
                        const panelTitle = statusObj.status === 'Draft' ? 'Applicant' : statusObj.status;
                        const approval = (stepKey === '1' || statusObj.status === 'Draft')
                            ? null
                            : resolveApprovalForStep(app, stepConfig, statusObj.status);
                        const formDataForStep = pickStepData(stepConfig, app.form_data || {});
                        const approvalDataForStep = pickStepData(stepConfig, approval?.approval_data || {});
                        const remarksDataForStep = stepConfig.slice(1).reduce((acc: Record<string, any>, field: any, idx: number) => {
                            if (!field?.name) return acc;
                            if (normalizeStageName(field.name) !== 'remarks') return acc;

                            const candidates = getStepFieldCandidates(field, idx + 1);
                            const targetKey = candidates[0];
                            if (targetKey && (approval?.remarks !== undefined && approval?.remarks !== null)) {
                                acc[targetKey] = approval.remarks;
                            }
                            return acc;
                        }, {});
                        const sourceData: any = (stepKey === '1' || statusObj.status === 'Draft')
                            ? formDataForStep
                            : { ...formDataForStep, ...approvalDataForStep, ...remarksDataForStep };
                        const signerName = (stepKey === '1' || statusObj.status === 'Draft')
                            ? (app.users ? [app.users.first_name, app.users.last_name].filter(Boolean).join(' ') : '')
                            : (approval?.users ? [approval.users.first_name, approval.users.last_name].filter(Boolean).join(' ') : '');

                        let fieldCounter = 0;
                        const mappedItems = stepConfig.slice(1).map((f: any) => {
                            const normalizedName = f.name?.replace(/\s+/g, '_');
                            if (!normalizedName) return null;

                            // headings don't increment field counter or get a number
                            if (f.type === 'heading') {
                                return { type: 'heading', name: f.name, key: f.id || `${normalizedName}_heading` };
                            }

                            fieldCounter++;
                            const currentFieldNum = fieldCounter;
                            const keyWithIdx = `${normalizedName}_${currentFieldNum}`;
                            const standardKey = f.id || keyWithIdx;
                            const finalKey = (sourceData[normalizedName] !== undefined && sourceData[standardKey] === undefined) 
                                             ? normalizedName 
                                             : standardKey;

                            let fieldValues: any[] = [];
                            if (f.type === 'date_from_to') {
                                const fromKey = `${finalKey}_from`;
                                const toKey = `${finalKey}_to`;
                                const oldFromKey = `${normalizedName}_from`;
                                const oldToKey = `${normalizedName}_to`;
                                
                                const actualFrom = (sourceData[oldFromKey] !== undefined && sourceData[fromKey] === undefined) ? oldFromKey : fromKey;
                                const actualTo = (sourceData[oldToKey] !== undefined && sourceData[toKey] === undefined) ? oldToKey : toKey;

                                fieldValues.push({
                                    key: actualFrom,
                                    label: `${f.name} (From)`,
                                    value: sourceData[actualFrom],
                                    index: currentFieldNum,
                                    type: 'date'
                                });
                                fieldValues.push({
                                    key: actualTo,
                                    label: `${f.name} (To)`,
                                    value: sourceData[actualTo],
                                    index: currentFieldNum,
                                    type: 'date'
                                });
                                
                                renderedFields.add(finalKey);
                                renderedFields.add(normalizedName);
                                renderedFields.add(actualFrom);
                                renderedFields.add(actualTo);
                            } else {
                                fieldValues.push({
                                    key: finalKey,
                                    label: f.name,
                                    value: sourceData[finalKey],
                                    index: currentFieldNum,
                                    type: f.type,
                                    options: f.options,
                                    subFields: f.subFields,
                                    signerName
                                });
                                renderedFields.add(finalKey);
                                renderedFields.add(normalizedName);
                            }

                            if (fieldValues.length > 0) return { type: 'field', fields: fieldValues };
                            return null;
                        }).filter(Boolean);

                        const groups: { title: string, fields: any[], isHeading: boolean }[] = [];
                        let currentGroup = { title: panelTitle, fields: [] as any[], isHeading: false };
                        groups.push(currentGroup);

                        mappedItems.forEach((item: any) => {
                            if (item.type === 'heading') {
                                renderedFields.add(item.key);
                                currentGroup = { title: item.name, fields: [], isHeading: true };
                                groups.push(currentGroup);
                            } else if (item.type === 'field') {
                                currentGroup.fields.push(...item.fields);
                            }
                        });

                        groups.forEach((g, gIdx) => {
                            g.fields.forEach((f: any) => renderedFields.add(f.key));
                            panels.push(
                                <Panel key={`step-${stepKey}-g-${gIdx}`} title={g.isHeading ? `${panelTitle} • ${g.title}` : g.title} style={{ marginBottom: '16px' }}>
                                    {g.fields.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            {g.fields.map((f: any, fIdx: number) => {
                                                const { key: k, value: v } = f;
                                                const uniqueKey = `${k}_${fIdx}`;
                                                const isWide = Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures')) || k.length > 50;

                                                  const parts = k.split('_');
                                                  const lastPart = parts[parts.length - 1];
                                                  const idxInKey = parseInt(lastPart);
                                                  const displayIdx = f.index || (!isNaN(idxInKey) ? idxInKey : null);
                                                  
                                                  let baseLabel = f.label;
                                                  if (!baseLabel) {
                                                      baseLabel = k.replace(/_/g, ' ');
                                                      if (!isNaN(idxInKey)) {
                                                          baseLabel = parts.slice(0, -1).join(' ');
                                                      }
                                                  }
                                                  
                                                  const label = displayIdx 
                                                      ? `${displayIdx}. ${formatTitleCase(baseLabel)}`
                                                      : formatTitleCase(baseLabel);

                                                return (
                                                    <div key={uniqueKey} style={{ gridColumn: isWide ? 'span 2' : 'auto' }}>
                                                        <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                            {label}
                                                        </div>
                                                        {(typeof v === 'string' && v.includes('/uploads/signatures')) || (f.type === 'signature' && !v && f.signerName) ? (
                                                            <div style={{ 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px', 
                                                                padding: '4px 10px', 
                                                                background: '#ecfdf5', 
                                                                color: '#059669', 
                                                                borderRadius: '6px', 
                                                                fontSize: '11px', 
                                                                fontWeight: 600,
                                                                border: '1px solid #d1fae5'
                                                            }}>
                                                                <ShieldCheck size={12} /> Digitally Signed{f.signerName ? ` by ${f.signerName}` : ''}
                                                            </div>
                                                        ) : Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' ? (
                                                            <div style={{ marginTop: '6px', overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                                    <thead style={{ background: '#f9fafb' }}>
                                                                        <tr>
                                                                            {Object.keys(v[0]).map(col => {
                                                                                const cLabel = getSubFieldLabel(col, f.subFields, formatTitleCase);
                                                                                return (
                                                                                    <th key={col} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600, textTransform: 'capitalize' }}>
                                                                                        {cLabel}
                                                                                    </th>
                                                                                );
                                                                            })}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {v.map((row: any, rIdx: number) => (
                                                                            <tr key={rIdx} style={{ borderBottom: rIdx === v.length - 1 ? 'none' : '1px solid #f3f4f6' }}>
                                                                                {Object.values(row).map((cell: any, cIdx: number) => <td key={cIdx} style={{ padding: '6px 8px', color: '#1f2937' }}>{String(cell || '—')}</td>)}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                          ) : f.type === 'paragraph_blanks' ? (
                                                              <div style={{ lineHeight: '1.8', color: '#374151', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                                                                  {(f.options?.[0] || '').split('[____]').map((seg: string, i: number, arr: any[]) => (
                                                                      <React.Fragment key={i}>
                                                                          {seg}
                                                                          {i < arr.length - 1 && (
                                                                              <span style={{ borderBottom: '1px solid #94a3b8', padding: '0 4px', fontWeight: 600, color: '#1f2937' }}>
                                                                                  {Array.isArray(v) && v[i] ? v[i] : '—'}
                                                                              </span>
                                                                          )}
                                                                      </React.Fragment>
                                                                  ))}
                                                              </div>
                                                          ) : (
                                                              <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                                                                  {typeof v === 'object' && v !== null ? (
                                                                      Object.entries(v)
                                                                          .filter(([_, val]) => val !== '' && val !== null)
                                                                          .map(([sk, sv]) => {
                                                                              const labelText = getSubFieldLabel(sk, f.subFields, formatTitleCase);
                                                                              return `${labelText}: ${sv}`;
                                                                          })
                                                                          .join(' | ') || '—'
                                                                  ) : (v === undefined || v === null || v === '' ? '—' : String(v))}
                                                              </div>
                                                          )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>No fields configured for this stage.</div>
                                    )}
                                </Panel>
                            );
                        });
                    });

                    // Unmapped fields
                    const unmapped = Object.entries(app.form_data || {}).filter(([k, v]) =>
                        !k.startsWith('__') &&
                        !renderedFields.has(k) &&
                        v !== '' &&
                        v !== null
                    );
                    if (unmapped.length > 0) {
                        panels.push(
                            <Panel key="unmapped" title="Other Details" style={{ marginBottom: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {unmapped.map(([k, v], uIdx) => {
                                        const isWide = Array.isArray(v) || (String(v).length > 50 && !String(v).startsWith('/uploads/signatures')) || k.length > 50;
                                        const finalIdx = uIdx + 1;
                                        
                                        const parts = k.split('_');
                                        const lastPart = parts[parts.length - 1];
                                        const idxVal = parseInt(lastPart);
                                        let baseName = k.replace(/_/g, ' ');

                                        if (!isNaN(idxVal)) {
                                             baseName = parts.slice(0, -1).join(' ');
                                         }
                                         const label = `${finalIdx}. ${formatTitleCase(baseName)}`;

                                        return (
                                            <div key={k} style={{ gridColumn: isWide ? 'span 2' : 'auto' }}>
                                                <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    {label}
                                                </div>
                                                {typeof v === 'string' && v.includes('/uploads/signatures') ? (
                                                    <div style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '6px', 
                                                        padding: '4px 10px', 
                                                        background: '#ecfdf5', 
                                                        color: '#059669', 
                                                        borderRadius: '6px', 
                                                        fontSize: '11px', 
                                                        fontWeight: 600,
                                                        border: '1px solid #d1fae5',
                                                        marginTop: '2px'
                                                    }}>
                                                        <ShieldCheck size={12} /> Digitally Signed{app.users ? ` by ${[app.users.first_name, app.users.last_name].filter(Boolean).join(' ')}` : ''}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: 500 }}>
                                                        {typeof v === 'object' && v !== null ? (
                                                            Object.entries(v)
                                                                .filter(([_, val]) => val !== '' && val !== null)
                                                                .map(([sk, sv]) => `${sk.replace(/_/g, ' ')}: ${sv}`)
                                                                .join(' | ') || '—'
                                                        ) : String(v || '—')}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                            actionSchema,
                            actionSteps,
                            app.current_status
                        );
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
                                                    value={approvalData[f.key]}
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
                        <button onClick={() => onDecision('APPROVED')} disabled={actionLoading}
                            style={{ flex: 1, padding: '10px', border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(22,163,74,0.3)', opacity: actionLoading ? 0.7 : 1 }}>
                            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} 
                            {actionLoading ? 'Approving...' : 'Approve'}
                        </button>
                    </div>
                </Panel>
            )}
        </div>
    );
}
