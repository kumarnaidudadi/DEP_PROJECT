'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { PendingWorkContent } from '../../pending/page';

function ActingPendingContent() {
    const params = useParams();
    const [assignment, setAssignment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssignment = async () => {
            try {
                // Find this specific acting role assignment
                const res = await api.get('/acting-roles/active');
                const match = res.data.find((r: any) => r.id === Number(params.id));
                setAssignment(match);
            } catch (err) {
                console.error('Failed to fetch acting role assignment', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignment();
    }, [params.id]);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>;
    }

    if (!assignment) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <h2>Assignment Not Found</h2>
                <p>This acting role assignment does not exist or has expired.</p>
            </div>
        );
    }

    return <PendingWorkContent actingRoleAssignment={assignment} />;
}

export default function ActingPendingPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={28} className="animate-spin" style={{ color: '#94a3b8' }} /></div>}>
            <ActingPendingContent />
        </Suspense>
    );
}
