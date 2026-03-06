'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Loader2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { Toast, ToastType } from '@/components/ui/Toast';

export default function LeaveForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        leave_type: 'Casual Leave',
        start_date: '',
        end_date: '',
        reason: '',
    });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setToast(null);

        try {
            // Form Type ID = 1 (Mock: In real app, fetch from /api/form-types)
            await api.post('/applications', {
                form_type_id: 1,
                form_data: formData,
            });

            setToast({ message: 'Application submitted successfully!', type: 'success' });

            // Delay redirect to show success message
            setTimeout(() => {
                router.push('/dashboard/applicant');
            }, 1000);
        } catch (error: any) {
            console.error('Submission failed', error);
            const errorMessage = error.response?.data?.error || 'Failed to submit application. Please try again.';
            setToast({ message: errorMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <Card className="max-w-2xl mx-auto shadow-xl bg-white border-none ring-1 ring-gray-200">
                <CardHeader className="space-y-1 pb-6 border-b border-gray-100 bg-white/50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            New Leave Application
                        </CardTitle>
                    </div>
                    <CardDescription className="text-base text-gray-500 ml-1">
                        Fill in the details below to request leave. Your manager will be notified.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <Label htmlFor="leave_type" className="text-sm font-semibold text-gray-700">
                                Leave Type
                            </Label>
                            <div className="relative">
                                <select
                                    id="leave_type"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    value={formData.leave_type}
                                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                                >
                                    <option>Casual Leave</option>
                                    <option>Earned Leave</option>
                                    <option>Sick Leave</option>
                                    <option>Restricted Holiday</option>
                                </select>
                                <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label htmlFor="start_date" className="text-sm font-semibold text-gray-700">
                                    From Date
                                </Label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="start_date"
                                        type="date"
                                        className="pl-10 py-2.5 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label htmlFor="end_date" className="text-sm font-semibold text-gray-700">
                                    To Date
                                </Label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <Input
                                        id="end_date"
                                        type="date"
                                        className="pl-10 py-2.5 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="reason" className="text-sm font-semibold text-gray-700">
                                Reason for Leave
                            </Label>
                            <div className="relative group">
                                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <textarea
                                    id="reason"
                                    rows={4}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[120px] transition-all focus:bg-white resize-none"
                                    placeholder="Briefly describe the reason for your leave request..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-6 flex items-center justify-end gap-4 border-t border-gray-100">
                            <Button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Application
                                        <CheckCircle2 className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
