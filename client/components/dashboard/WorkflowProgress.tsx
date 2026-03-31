'use client';
// ─── ApprovalTimeline ──────────────────────────────────────────────────────────
// Shows the dynamic forwarding and approval history as a timeline.
// Replaces the old static WorkflowProgress component.

import React from 'react';
import { FormForward } from '@/types';

interface Props {
  forwards?: FormForward[];
  approvals?: any[];
  currentStatus?: string;
  submittedBy?: { name: string };
  style?: React.CSSProperties;
}

export default function ApprovalTimeline({
  forwards = [],
  approvals = [],
  currentStatus,
  submittedBy,
}: Props) {
  // Build timeline events sorted by time
  type TimelineEvent = {
    id: string;
    type: 'submitted' | 'forwarded' | 'approved' | 'rejected' | 'pending';
    label: string;
    sublabel?: string;
    time: Date;
  };

  const events: TimelineEvent[] = [];

  // 1. Submitted event
  events.push({
    id: 'submitted',
    type: 'submitted',
    label: 'Submitted',
    sublabel: submittedBy
      ? `by ${submittedBy.name}`
      : undefined,
    time: new Date(0), // Will be earliest
  });

  // 2. Forward events
  forwards.forEach((fwd, i) => {
    const fromName = fwd.from_user?.name || 'Unknown';
    const toName = fwd.to_user?.name || 'Unknown';
    events.push({
      id: `fwd-${fwd.id || i}`,
      type: 'forwarded',
      label: `Forwarded to ${toName}`,
      sublabel: `by ${fromName}${fwd.note ? ` — "${fwd.note}"` : ''}`,
      time: new Date(fwd.forwarded_at),
    });
  });

  // 3. Approval events
  approvals.forEach((appr, i) => {
    if (appr.decision === 'PENDING') {
      const approverName = appr.users
        ? `${appr.users.name}`
        : 'Awaiting';
      events.push({
        id: `appr-${appr.id || i}`,
        type: 'pending',
        label: `Pending: ${appr.stage?.replace(/_/g, ' ') || 'Review'}`,
        sublabel: `Assigned to ${approverName}`,
        time: new Date(appr.decided_at || Date.now()),
      });
    } else {
      const approverName = appr.users
        ? `${appr.users.name}`
        : 'Unknown';
      const isApproved = appr.decision === 'APPROVED';
      events.push({
        id: `appr-${appr.id || i}`,
        type: isApproved ? 'approved' : 'rejected',
        label: `${isApproved ? 'Approved' : 'Rejected'} by ${approverName}`,
        sublabel: appr.remarks || undefined,
        time: new Date(appr.decided_at),
      });
    }
  });

  // Sort by time (submitted always first)
  events.sort((a, b) => {
    if (a.id === 'submitted') return -1;
    if (b.id === 'submitted') return 1;
    return a.time.getTime() - b.time.getTime();
  });

  const colorMap: Record<string, { bg: string; border: string; dot: string; text: string }> = {
    submitted: { bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb', text: '#1e40af' },
    forwarded: { bg: '#fef3c7', border: '#fde68a', dot: '#d97706', text: '#92400e' },
    approved: { bg: '#dcfce7', border: '#bbf7d0', dot: '#16a34a', text: '#166534' },
    rejected: { bg: '#fee2e2', border: '#fecaca', dot: '#dc2626', text: '#991b1b' },
    pending: { bg: '#f3f4f6', border: '#d1d5db', dot: '#6b7280', text: '#374151' },
  };

  const iconMap: Record<string, string> = {
    submitted: '📋',
    forwarded: '➡️',
    approved: '✓',
    rejected: '✕',
    pending: '⏳',
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ position: 'relative' }}>
        {events.map((ev, idx) => {
          const colors = colorMap[ev.type] || colorMap.pending;
          const isLast = idx === events.length - 1;

          return (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                gap: '16px',
                position: 'relative',
                paddingBottom: isLast ? '0' : '20px',
              }}
            >
              {/* Vertical line */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: '15px',
                    top: '32px',
                    bottom: '0',
                    width: '2px',
                    background: '#e5e7eb',
                  }}
                />
              )}

              {/* Dot */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: colors.bg,
                  border: `2px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: ev.type === 'approved' || ev.type === 'rejected' ? '14px' : '13px',
                  fontWeight: 700,
                  color: colors.dot,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {iconMap[ev.type]}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingTop: '4px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: colors.text,
                    lineHeight: 1.3,
                  }}
                >
                  {ev.label}
                </div>
                {ev.sublabel && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginTop: '2px',
                      lineHeight: 1.4,
                    }}
                  >
                    {ev.sublabel}
                  </div>
                )}
                {ev.id !== 'submitted' && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#9ca3af',
                      marginTop: '2px',
                    }}
                  >
                    {ev.time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {ev.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Final status */}
      {currentStatus && ['APPROVED', 'REJECTED'].includes(currentStatus) && (
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: currentStatus === 'APPROVED' ? '#dcfce7' : '#fee2e2',
            border: `1px solid ${currentStatus === 'APPROVED' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '13px',
            fontWeight: 700,
            color: currentStatus === 'APPROVED' ? '#166534' : '#991b1b',
            textAlign: 'center',
          }}
        >
          {currentStatus === 'APPROVED' ? '✓ Fully Approved' : '✕ Rejected'}
        </div>
      )}
    </div>
  );
}
