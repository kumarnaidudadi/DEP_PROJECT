'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Plus, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Application {
    id: number;
    current_status: string;
    submitted_at: string;
    form_types?: { name: string };
    form_data: any;
}

export default function ApplicantDashboard() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            try {
                const res = await api.get('/applications');
                setApplications(res.data);
            } catch (error) {
                console.error('Failed to fetch applications', error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
                    <p className="text-gray-500 mt-1">Manage and track your leave and travel requests</p>
                </div>
                <Button onClick={() => router.push('/forms/leave')} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> New Application
                </Button>
            </div>

            <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your submission history</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading applications...</div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No applications found. Start by creating one!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="border-b border-gray-100 text-gray-500 text-sm">
                                    <tr>
                                        <th className="pb-3 pl-4 font-medium">Type</th>
                                        <th className="pb-3 font-medium">Date Submitted</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 pr-4 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {applications.map((app) => (
                                        <tr key={app.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 pl-4 font-medium text-gray-900">
                                                {app.form_types?.name || 'Application'}
                                            </td>
                                            <td className="py-4 text-gray-500">
                                                {new Date(app.submitted_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-4">
                                                {getStatusBadge(app.current_status)}
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                    View Details
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
