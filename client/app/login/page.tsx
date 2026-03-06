'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label } from '@/components/ui';
import { Loader2, AlertCircle, ArrowLeft, Mail, KeyRound } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── STEP 1: SEND OTP ──────────────────────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await api.post('/auth/send-otp', { email });
            setStep('otp');
        } catch (err: any) {
            console.error('Send OTP failed:', err);
            setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── STEP 2: VERIFY OTP ────────────────────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await api.post('/auth/verify-otp', { email, otp });
            const { token, user } = res.data;

            // Store session
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Role-based redirection
            const roles = user.roles || [];
            if (roles.includes('ADMIN')) {
                router.push('/dashboard/admin');
            } else if (roles.includes('APPROVER')) {
                router.push('/dashboard/approver');
            } else {
                router.push('/dashboard/applicant');
            }
        } catch (err: any) {
            console.error('Verify OTP failed:', err);
            setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── GOOGLE LOGIN ──────────────────────────────────────────────────
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError(null);
        setIsLoading(true);

        try {
            const res = await api.post('/auth/google', {
                token: credentialResponse.credential,
            });

            const { token, user } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Role-based redirection
            const roles = user.roles || [];
            if (roles.includes('ADMIN')) {
                router.push('/dashboard/admin');
            } else if (roles.includes('APPROVER')) {
                router.push('/dashboard/approver');
            } else {
                router.push('/dashboard/applicant');
            }
        } catch (err: any) {
            console.error('Google login failed:', err);
            const errorMessage = err.response?.data?.error || 'Google login failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <Card className="w-full max-w-md bg-white shadow-xl rounded-xl border-0">
                <CardHeader className="space-y-1 text-center pb-8">
                    <CardTitle className="text-3xl font-bold tracking-tight text-gray-900">
                        {step === 'email' ? 'Welcome Back' : 'Enter Code'}
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        {step === 'email'
                            ? 'Sign in with your registered email'
                            : `We sent a code to ${email}`}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Step 1: Email Form */}
                    {step === 'email' && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="pl-9 border-gray-300 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg h-11"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Send Login Code"
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Step 2: OTP Form */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">One-Time Password</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        maxLength={6}
                                        className="pl-9 border-gray-300 focus:ring-2 focus:ring-blue-500 tracking-widest"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg h-11"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Verify & Login"
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() => { setStep('email'); setError(null); }}
                                className="w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mt-2"
                                disabled={isLoading}
                            >
                                <ArrowLeft className="h-3 w-3" />
                                Change email
                            </button>
                        </form>
                    )}

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <div className="w-full flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Google Sign-In failed')}
                            theme="filled_blue"
                            shape="pill"
                            width="350"
                            size="large"
                            text="continue_with"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
