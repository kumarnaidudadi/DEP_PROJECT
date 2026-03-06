'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui';
import { CheckCircle, XCircle, FileText, Upload, AlertCircle } from 'lucide-react';

interface Application {
    id: number;
    current_status: string;
    submitted_at: string;
    form_types?: { name: string };
    form_data: any;
    users?: { first_name: string; last_name: string };
}

export default function ApproverDashboard() {
    const router = useRouter();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [remarks, setRemarks] = useState('');
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchApplications();
    }, []);

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

    const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
        if (!selectedApp) return;
        if (status === 'APPROVED' && !signatureFile) {
            setError('Digital signature is required for approval');
            return;
        }

        setActionLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('status', status);
            formData.append('remarks', remarks);
            if (signatureFile) {
                formData.append('signature', signatureFile);
            }

            await api.patch(`/applications/${selectedApp.id}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // Refresh list and close modal
            await fetchApplications();
            setSelectedApp(null);
            setRemarks('');
            setSignatureFile(null);
        } catch (error: any) {
            console.error('Action failed', error);
            setError(error.response?.data?.error || 'Failed to update application');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Approvals Dashboard</h1>
                <p className="text-gray-500 mt-1">Review and sign pending applications</p>
            </div>

            <Card className="border-0 shadow-lg bg-white">
                <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading...</div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No pending applications.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="border-b border-gray-100 text-gray-500 text-sm">
                                <tr>
                                    <th className="pb-3 pl-4 font-medium">Applicant</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 pr-4 text-right font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {applications.map((app) => (
                                    <tr key={app.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                        <td className="py-4 pl-4 font-medium text-gray-900">
                                            {app.users ? `${app.users.first_name} ${app.users.last_name}` : 'Unknown'}
                                        </td>
                                        <td className="py-4 text-gray-500">{app.form_types?.name || 'Application'}</td>
                                        <td className="py-4 text-gray-500">{new Date(app.submitted_at).toLocaleDateString()}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${app.current_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                    app.current_status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {app.current_status}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-right">
                                            <Button size="sm" onClick={() => setSelectedApp(app)}>Review</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* Review Modal */}
            {selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
                        <CardHeader>
                            <CardTitle>Review Application #{selectedApp.id}</CardTitle>
                            <CardDescription>From: {selectedApp.users?.first_name} {selectedApp.users?.last_name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap font-mono">
                                {JSON.stringify(selectedApp.form_data, null, 2)}
                            </div>

                            <div className="space-y-4">
                                <Label>Remarks</Label>
                                <Input
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Add comments..."
                                />

                                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                    <Label htmlFor="sig-upload" className="cursor-pointer text-blue-600 hover:text-blue-800">
                                        Upload Digital Signature
                                    </Label>
                                    <input
                                        id="sig-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                                    />
                                    {signatureFile && (
                                        <p className="text-sm text-green-600 mt-2 font-medium">Selected: {signatureFile.name}</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="text-red-600 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setSelectedApp(null)}>Cancel</Button>
                                <Button
                                    className="bg-red-500 hover:bg-red-600 text-white"
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={actionLoading}
                                >
                                    Reject
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={actionLoading}
                                >
                                    Approve & Sign
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
