'use client';
// ─── PendingWorkView ───────────────────────────────────────────────────────────
// Middle panel list of pending approvals / processed items.

import React from 'react';
import { Application } from '@/types';
import ListItem from '../ListItem';
import StatusBadge from '../StatusBadge';

interface Props {
    pendingApps: Application[];
    processedApps: Application[];
    selectedApp: Application | null;
    appTab: 'ongoing' | 'completed';
    searchQuery: string;
    onSelect: (app: Application) => void;
}

export default function PendingWorkView({
    pendingApps, processedApps, selectedApp, appTab, searchQuery, onSelect,
}: Props) {
    let list = appTab === 'ongoing' ? pendingApps : processedApps;

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a =>
            a.form_types?.name.toLowerCase().includes(q) ||
            a.users?.first_name.toLowerCase().includes(q) ||
            a.users?.last_name.toLowerCase().includes(q)
        );
    }

    const emptyMsg = appTab === 'ongoing' ? 'No pending items' : 'No completed items';

    if (list.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '12px' }}>
                {emptyMsg}
            </div>
        );
    }

    return (
        <>
            {list.map(a => (
                <ListItem key={a.id} sel={selectedApp?.id === a.id} onClick={() => onSelect(a)}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>
                            {a.users ? `${a.users.first_name} ${a.users.last_name}` : 'Unknown'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{a.form_types?.name || 'Application'}</div>
                        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                            {new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                    <StatusBadge status={a.current_status} />
                </ListItem>
            ))}
        </>
    );
}
