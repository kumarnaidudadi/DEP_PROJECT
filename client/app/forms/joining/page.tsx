'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import { Button, Input, Card, Label } from '../../../components/ui';
import { ArrowLeft } from 'lucide-react';

function JoiningForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeId = searchParams.get('typeId');

    const [formData, setFormData] = useState({
        joiningDate: '',
        shift: 'FN', // Forenoon or Afternoon
        reasonForLate: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!typeId) {
            alert('Invalid Form Type');
            return;
        }

        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            await api.post('/forms', {
                form_type_id: parseInt(typeId),
                submitted_by: user?.id,
                form_data: formData
            });

            router.push('/dashboard');
        } catch (error) {
            console.error('Submission failed', error);
            alert('Failed to submit application');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <Button onClick={() => router.back()} className="mb-6 bg-gray-200 text-gray-800 hover:bg-gray-300">
                    <ArrowLeft size={20} className="mr-2" /> Back
                </Button>
                <Card>
                    <h1 className="text-2xl font-bold mb-6 border-b pb-4">Joining Report</h1>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <Label htmlFor="joiningDate">Date of Joining</Label>
                                <Input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
                            </div>

                            <div>
                                <Label htmlFor="shift">Shift</Label>
                                <select
                                    id="shift"
                                    name="shift"
                                    value={formData.shift}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="FN">Forenoon (FN)</option>
                                    <option value="AN">Afternoon (AN)</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <Label htmlFor="reasonForLate">Reason for Overstay (if any)</Label>
                                <textarea
                                    id="reasonForLate"
                                    name="reasonForLate"
                                    value={formData.reasonForLate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end">
                            <Button type="submit" className="w-full md:w-auto">Submit Report</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default function JoiningPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <JoiningForm />
        </Suspense>
    );
}
