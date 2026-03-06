'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Card, Button } from '../../../components/ui';
import { FileText, ArrowLeft } from 'lucide-react';

interface FormType {
    id: number;
    name: string;
    description: string;
}

export default function CreateFormPage() {
    const [types, setTypes] = useState<FormType[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        try {
            const response = await api.get('/forms/types');
            setTypes(response.data);
        } catch (error) {
            console.error('Failed to fetch form types', error);
            // Fallback if API fails or Types not seeded yet
            setTypes([
                { id: 1, name: 'Leave Application', description: 'Apply for leave.' },
                { id: 2, name: 'LTC Bill', description: 'Submit LTC Bill.' },
                { id: 3, name: 'Joining Report', description: 'Report joining after leave.' },
            ]);
        }
    };

    const handleSelect = (type: FormType) => {
        // Map form type name to route slug
        let slug = '';
        if (type.name.toLowerCase().includes('leave')) slug = 'leave';
        else if (type.name.toLowerCase().includes('ltc')) slug = 'ltc';
        else if (type.name.toLowerCase().includes('joining')) slug = 'joining';
        else slug = type.name.toLowerCase().replace(/\s+/g, '-');

        router.push(`/forms/${slug}?typeId=${type.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Button onClick={() => router.back()} className="mb-8 bg-gray-200 text-gray-800 hover:bg-gray-300">
                    <ArrowLeft size={20} className="mr-2" /> Back
                </Button>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Select Application Type</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {types.map((type) => (
                        <Card
                            key={type.id}
                            className="hover:shadow-lg transition-transform hover:-translate-y-1 cursor-pointer flex flex-col items-center text-center p-8"
                        >
                            <div className="bg-blue-100 p-4 rounded-full mb-4">
                                <FileText size={32} className="text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">{type.name}</h3>
                            <p className="text-gray-500 mb-6">{type.description}</p>
                            <Button onClick={() => handleSelect(type)} className="w-full">
                                Start Application
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
