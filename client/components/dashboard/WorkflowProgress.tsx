'use client';
// ─── WorkflowProgress ──────────────────────────────────────────────────────────
// Horizontal step tracker. Used in both the form-fill panel and application detail.

import React from 'react';
import { WorkflowStep } from '@/types';

interface Props {
    steps: WorkflowStep[];
    currentStatus?: string;  // undefined = form-fill mode (all steps shown as pending)
    isApproved?: boolean;
    isRejected?: boolean;
}

export default function WorkflowProgress({ steps, currentStatus, isApproved = false, isRejected = false }: Props) {
    const curIdx = currentStatus ? steps.findIndex(s => s.step_name === currentStatus) : -1;
    const isDone = isApproved || isRejected;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
            {steps.map((step, i) => {
                const isPast = curIdx > i || isApproved;
                const isCur = step.step_name === currentStatus;

                const bg = isPast
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : isCur
                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                        : currentStatus
                            ? '#e5e7eb'
                            : 'linear-gradient(135deg, #3b82f6, #2563eb)';

                const shadow = isCur
                    ? '0 2px 8px rgba(37,99,235,0.35), 0 0 0 3px rgba(59,130,246,0.15)'
                    : isPast
                        ? '0 2px 8px rgba(22,163,74,0.3)'
                        : 'none';

                const lineColor = isPast ? '#22c55e' : '#e5e7eb';

                return (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center' }}>
                        <div className="group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: bg,
                                color: isPast || isCur || !currentStatus ? '#fff' : '#9ca3af',
                                fontSize: isPast ? '14px' : '13px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: shadow, transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {isPast ? '✓' : i + 1}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                                {step.step_name.replace(/_/g, ' ')}
                                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                            </div>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ width: '40px', height: '2px', background: currentStatus ? lineColor : 'linear-gradient(90deg, #93c5fd, #bfdbfe)', borderRadius: '1px', margin: '0 4px', transition: 'background 0.3s' }} />
                        )}
                    </div>
                );
            })}

            {/* Final done/approved/rejected node (only shown in detail view) */}
            {currentStatus && (
                <>
                    <div style={{ width: '40px', height: '2px', background: isDone ? (isApproved ? '#22c55e' : '#ef4444') : '#e5e7eb', borderRadius: '1px', margin: '0 4px', transition: 'background 0.3s' }} />
                    <div className="group" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: isApproved ? 'linear-gradient(135deg, #22c55e, #16a34a)' : isRejected ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e5e7eb',
                            color: isDone ? '#fff' : '#9ca3af',
                            fontSize: '14px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isApproved ? '0 2px 8px rgba(22,163,74,0.3)' : isRejected ? '0 2px 8px rgba(239,68,68,0.3)' : 'none',
                            transition: 'transform 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {isApproved ? '✓' : isRejected ? '✕' : '⋯'}
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] bg-slate-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl border border-slate-700 pointer-events-none">
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1e293b' }} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
