'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import { Button, Input, Card, Label } from '../../../components/ui';
import { ArrowLeft } from 'lucide-react';

function LTCForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeId = searchParams.get('typeId');

    const [formData, setFormData] = useState({
        blockYear: '',
        placeVisited: '',
        dateOfJourney: '',
        returnDate: '',
        totalAmountClaimed: '',
        advanceDrawn: ''
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
                    <h1 className="text-2xl font-bold mb-6 border-b pb-4">LTC Bill Application</h1>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="blockYear">Block Year</Label>
                                <Input name="blockYear" value={formData.blockYear} onChange={handleChange} placeholder="e.g. 2024-2027" required />
                            </div>
                            <div>
                                <Label htmlFor="placeVisited">Place Visited</Label>
                                <Input name="placeVisited" value={formData.placeVisited} onChange={handleChange} required />
                            </div>

                            <div>
                                <Label htmlFor="dateOfJourney">Date of Journey</Label>
                                <Input type="date" name="dateOfJourney" value={formData.dateOfJourney} onChange={handleChange} required />
                            </div>
                            <div>
                                <Label htmlFor="returnDate">Return Date</Label>
                                <Input type="date" name="returnDate" value={formData.returnDate} onChange={handleChange} required />
                            </div>

                            <div>
                                <Label htmlFor="totalAmountClaimed">Total Amount Claimed (₹)</Label>
                                <Input type="number" name="totalAmountClaimed" value={formData.totalAmountClaimed} onChange={handleChange} required />
                            </div>

                            <div>
                                <Label htmlFor="advanceDrawn">Advance Drawn (₹)</Label>
                                <Input type="number" name="advanceDrawn" value={formData.advanceDrawn} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end">
                            <Button type="submit" className="w-full md:w-auto">Submit Bill</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}

export default function LTCPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LTCForm />
        </Suspense>
    );
}
