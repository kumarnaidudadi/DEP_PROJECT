'use client';
// ─── ApprovalTimeline ──────────────────────────────────────────────────────────
// Shows the dynamic forwarding and approval history as a premium timeline.

import React from 'react';
import { FormForward } from '@/types';

interface Props {
  forwards?: FormForward[];
  approvals?: any[];
  currentStatus?: string;
  submittedBy?: { name?: string; first_name?: string; last_name?: string; email?: string };
  style?: React.CSSProperties;
}

/** Resolve a display name from any user shape the API might return */
function resolveName(user: any): string {
  if (!user) return 'Unknown';
  if (user.name && user.name !== 'undefined') return user.name;
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return user.email || 'Unknown';
}

export default function ApprovalTimeline({
  forwards = [],
  approvals = [],
  currentStatus,
  submittedBy,
}: Props) {
  type EventType = 'submitted' | 'forwarded' | 'approved' | 'rejected' | 'pending';

  type TimelineEvent = {
    id: string;
    type: EventType;
    title: string;
    actor?: string;
    target?: string;
    note?: string;
    time?: Date;
  };

  const events: TimelineEvent[] = [];

  // 1. Submitted event
  const submitterName = resolveName(submittedBy);
  events.push({
    id: 'submitted',
    type: 'submitted',
    title: 'Application Submitted',
    actor: submitterName !== 'Unknown' ? submitterName : undefined,
    time: undefined,
  });

  // 2. Forward events
  forwards.forEach((fwd, i) => {
    const fromName = resolveName(fwd.from_user);
    const toName = resolveName(fwd.to_user);
    
    let type: EventType = 'forwarded';
    let title = 'Forwarded for Review';
    const action = (fwd as any).action || 'forwarded';

    if (action === 'approved') {
      type = 'approved';
      title = 'Approved & Returned';
    } else if (action === 'rejected') {
      type = 'rejected';
      title = 'Rejected & Returned';
    }

    events.push({
      id: `fwd-${fwd.id || i}`,
      type,
      title,
      actor: fromName,
      target: toName,
      note: (fwd as any).note || (fwd as any).remarks || undefined,
      time: new Date(fwd.forwarded_at),
    });
  });

  // 3. Approval events
  approvals.forEach((appr, i) => {
    if (appr.decision === 'PENDING') {
      const approverName = resolveName(appr.users);
      events.push({
        id: `appr-${appr.id || i}`,
        type: 'pending',
        title: 'Awaiting Decision',
        actor: approverName,
        time: appr.decided_at ? new Date(appr.decided_at) : undefined,
      });
    } else {
      const approverName = resolveName(appr.users);
      const isApproved = appr.decision === 'APPROVED';
      events.push({
        id: `appr-${appr.id || i}`,
        type: isApproved ? 'approved' : 'rejected',
        title: isApproved ? 'Approved' : 'Rejected',
        actor: approverName,
        note: appr.remarks || undefined,
        time: appr.decided_at ? new Date(appr.decided_at) : undefined,
      });
    }
  });

  // Sort: submitted always first, then by time
  events.sort((a, b) => {
    if (a.id === 'submitted') return -1;
    if (b.id === 'submitted') return 1;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.getTime() - b.time.getTime();
  });

  const isTerminal = currentStatus && ['APPROVED', 'REJECTED'].includes(currentStatus);
  const isFullyApproved = currentStatus === 'APPROVED';

  const config: Record<EventType, {
    dotBg: string; dotBorder: string; dotColor: string;
    iconChar: string; badgeBg: string; badgeText: string; badgeLabel: string;
  }> = {
    submitted: {
      dotBg: '#eff6ff', dotBorder: '#93c5fd', dotColor: '#2563eb',
      iconChar: '◎', badgeBg: '#dbeafe', badgeText: '#1d4ed8', badgeLabel: 'Submitted',
    },
    forwarded: {
      dotBg: '#fffbeb', dotBorder: '#fcd34d', dotColor: '#b45309',
      iconChar: '→', badgeBg: '#fef3c7', badgeText: '#92400e', badgeLabel: 'Forwarded',
    },
    approved: {
      dotBg: '#f0fdf4', dotBorder: '#86efac', dotColor: '#16a34a',
      iconChar: '✓', badgeBg: '#dcfce7', badgeText: '#166534', badgeLabel: 'Approved',
    },
    rejected: {
      dotBg: '#fff1f2', dotBorder: '#fca5a5', dotColor: '#dc2626',
      iconChar: '✕', badgeBg: '#fee2e2', badgeText: '#991b1b', badgeLabel: 'Rejected',
    },
    pending: {
      dotBg: '#f9fafb', dotBorder: '#d1d5db', dotColor: '#6b7280',
      iconChar: '⋯', badgeBg: '#f3f4f6', badgeText: '#374151', badgeLabel: 'Pending',
    },
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: '4px 0 8px' }}>
      {events.map((ev, idx) => {
        const c = config[ev.type];
        const isLast = idx === events.length - 1;

        return (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              gap: '0',
              position: 'relative',
              paddingBottom: isLast ? '0' : '0',
            }}
          >
            {/* Left column: dot + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', flexShrink: 0 }}>
              {/* Dot */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: c.dotBg,
                  border: `2px solid ${c.dotBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: c.dotColor,
                  flexShrink: 0,
                  zIndex: 1,
                  boxShadow: `0 0 0 3px ${c.dotBg}`,
                  transition: 'box-shadow 0.2s',
                }}
              >
                {c.iconChar}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div
                  style={{
                    width: '2px',
                    flexGrow: 1,
                    minHeight: '24px',
                    background: 'linear-gradient(to bottom, #e5e7eb 0%, #f3f4f6 100%)',
                    margin: '4px 0',
                  }}
                />
              )}
            </div>

            {/* Right column: card */}
            <div
              style={{
                flex: 1,
                marginLeft: '12px',
                marginBottom: isLast ? '0' : '16px',
                background: '#fff',
                border: '1px solid #f1f5f9',
                borderRadius: '10px',
                padding: '12px 14px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                minWidth: 0,
              }}
            >
              {/* Top row: title + badge + time */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1e293b',
                    flex: 1,
                    minWidth: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {ev.title}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: c.badgeBg,
                    color: c.badgeText,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {c.badgeLabel}
                </span>
              </div>

              {/* Actor / Target row */}
              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                {ev.actor && (
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    <span style={{ color: '#94a3b8', marginRight: '3px', fontSize: '11px' }}>by</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{ev.actor}</span>
                  </span>
                )}
                {ev.target && (
                  <>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>→</span>
                    <span style={{ fontSize: '12px', color: '#475569' }}>
                      <span style={{ color: '#94a3b8', marginRight: '3px', fontSize: '11px' }}>to</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{ev.target}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Note */}
              {ev.note && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: 1.5,
                    borderLeft: '3px solid #e2e8f0',
                    fontStyle: 'italic',
                  }}
                >
                  "{ev.note}"
                </div>
              )}

              {/* Timestamp */}
              {ev.time && (
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {formatDate(ev.time)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Final status banner */}
      {isTerminal && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: isFullyApproved
              ? 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)'
              : 'linear-gradient(135deg, #fee2e2 0%, #fff1f2 100%)',
            border: `1.5px solid ${isFullyApproved ? '#86efac' : '#fca5a5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: isFullyApproved ? '#15803d' : '#dc2626',
          }}
        >
          <span style={{ fontSize: '16px' }}>{isFullyApproved ? '✓' : '✕'}</span>
          {isFullyApproved ? 'Fully Approved' : 'Rejected'}
        </div>
      )}
    </div>
  );
}
