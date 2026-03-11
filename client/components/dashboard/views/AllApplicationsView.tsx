'use client';
// ─── AllApplicationsView ───────────────────────────────────────────────────────
// Middle panel list of "My Applications" with ongoing/completed tabs.

import React from 'react';
import { Application } from '@/types';
import ListItem from '../ListItem';
import StatusBadge from '../StatusBadge';

interface Props {
    applications: Application[];
    selectedApp: Application | null;
    appTab: 'ongoing' | 'completed';
    searchQuery: string;
    isAdmin: boolean;
    userId: number;
    onSelect: (app: Application) => void;
}

const isTerminal = (s: string) => ['APPROVED', 'REJECTED'].includes(s);

export default function AllApplicationsView({
    applications, selectedApp, appTab, searchQuery, isAdmin, userId, onSelect,
}: Props) {
    const baseApps = isAdmin ? applications : applications.filter(a => a.submitted_by === userId);
    let list = appTab === 'ongoing'
        ? baseApps.filter(a => !isTerminal(a.current_status))
        : baseApps.filter(a => isTerminal(a.current_status));

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(a =>
            a.form_types?.name.toLowerCase().includes(q) ||
            a.users?.first_name.toLowerCase().includes(q) ||
            a.users?.last_name.toLowerCase().includes(q)
        );
    }

    if (list.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '12px' }}>
                No {appTab} applications
            </div>
        );
    }

    return (
        <>
            {list.map(a => (
                <ListItem key={a.id} sel={selectedApp?.id === a.id} onClick={() => onSelect(a)}>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{a.form_types?.name || 'Application'}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                            {new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    </div>
                    <StatusBadge status={a.current_status} />
                </ListItem>
            ))}
        </>
    );
}
