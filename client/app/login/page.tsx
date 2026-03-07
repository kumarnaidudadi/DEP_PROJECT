'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import api from '@/lib/api';
import { Button, Input, Label } from '@/components/ui';
import { Loader2, AlertCircle, Mail, KeyRound, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

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

            // Redirect to unified dashboard (it handles roles internally)
            router.push('/dashboard');
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

            // Redirect to unified dashboard (it handles roles internally)
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Google login failed:', err);
            const errorMessage = err.response?.data?.error || 'Google login failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-[#F7F5F0]">
            {/* Left Box (Form) */}
            <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col px-8 py-8 sm:px-16 md:px-24 lg:px-20 xl:px-32 relative z-10 mx-auto">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-16 lg:mb-24">
                    <div className="p-1.5 bg-white rounded border border-gray-200 shadow-sm flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-gray-800" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tighter text-gray-900">LTMS</span>
                </div>

                {/* Content */}
                <div className="flex-1 w-full justify-center flex flex-col space-y-6">
                    <div>
                        <h1 className="text-[2.5rem] leading-tight font-extrabold tracking-tight text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-[#6C757D] font-medium text-[15px] mb-8">LTMS Portal Access • Leave & Travel Management</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Email Address</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-[18px] w-[18px] text-gray-400" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="pl-12 h-14 bg-white border-0 shadow-sm rounded-xl text-[15px] focus:ring-2 focus:ring-blue-500 font-medium placeholder:font-normal placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1A62FF] hover:bg-blue-700 text-white font-semibold py-2 rounded-xl h-14 flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_-8px_rgba(26,98,255,0.6)]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Get OTP <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <Label htmlFor="otp" className="text-[10px] font-bold uppercase tracking-widest text-gray-500">One-Time Password</Label>
                                    <button
                                        type="button"
                                        onClick={() => { setStep('email'); setError(null); }}
                                        className="text-[10px] font-bold text-[#E55039] hover:text-red-700 transition-colors"
                                    >
                                        Change Email?
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <KeyRound className="h-[18px] w-[18px] text-gray-400" />
                                    </div>
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="••••••"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        maxLength={6}
                                        className="pl-12 h-14 bg-white border-0 shadow-sm rounded-xl text-xl tracking-widest focus:ring-2 focus:ring-blue-500 font-medium"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1A62FF] hover:bg-blue-700 text-white font-semibold py-2 rounded-xl h-14 flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_-8px_rgba(26,98,255,0.6)]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In <ChevronRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Divider */}
                    <div className="relative pt-6 pb-2">
                        <div className="absolute inset-0 flex items-center pt-4">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="bg-[#F7F5F0] px-3 text-[#B0ADAC]">
                                Quick Access
                            </span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <div className="flex justify-center w-full pb-4">
                        <div className="inline-block bg-white rounded-full shadow-sm hover:shadow transition-shadow overflow-hidden p-1 border border-gray-100">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setError('Google Sign-In failed')}
                                theme="outline"
                                shape="pill"
                                size="large"
                                text="signin_with"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 lg:mt-auto pt-8 text-[10px] uppercase tracking-[0.2em] text-[#AFAFAF] font-bold flex flex-col gap-1.5">
                    <span>Authorized Personnel Only</span>
                    <span className="opacity-60 uppercase">© 2024 LTMS - V 1.4.0</span>
                </div>
            </div>

            {/* Right Box (Image with Badges) */}
            <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative overflow-hidden rounded-l-[2rem] shadow-2xl m-4 lg:my-6 lg:mr-6 lg:ml-0 bg-gray-100 border border-gray-200/50">
                {/* Background Image placeholder - User will put their image at /public/login-bg.jpg */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                    style={{ backgroundImage: "url('/login-bg.jpg.jpeg')" }}
                />

                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent" />

                {/* Top Right Badge */}
                <div className="absolute top-8 right-8 bg-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-gray-100">
                    <div className="bg-[#10B981] p-1.5 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[13px] font-extrabold text-gray-900 leading-none mb-1">Access Verified</span>
                        <span className="text-[10px] font-semibold text-[#8C9BA5] leading-none">System Ready</span>
                    </div>
                </div>

                {/* Bottom Center Badge */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-xl px-6 py-4 rounded-3xl shadow-xl flex flex-col items-center border border-white/40">
                    <div className="flex -space-x-3 mb-3">
                        {/* Fake avatars */}
                        <div className="w-9 h-9 rounded-full border-[2.5px] border-white bg-blue-100 flex items-center justify-center shadow-sm">
                            <span className="text-[10px] font-bold text-blue-600">JD</span>
                        </div>
                        <div className="w-9 h-9 rounded-full border-[2.5px] border-white bg-indigo-100 flex items-center justify-center shadow-sm z-10">
                            <span className="text-[10px] font-bold text-indigo-600">SM</span>
                        </div>
                        <div className="w-9 h-9 rounded-full border-[2.5px] border-white bg-emerald-100 flex items-center justify-center shadow-sm z-20">
                            <span className="text-[10px] font-bold text-emerald-600">AK</span>
                        </div>
                        <div className="w-9 h-9 rounded-full border-[2.5px] border-white bg-amber-100 flex items-center justify-center shadow-sm z-30">
                            <span className="text-[11px] font-bold text-amber-700">+12</span>
                        </div>
                    </div>
                    <span className="text-[11px] font-extrabold tracking-wide text-gray-900">4 Recent Travel Requests</span>
                </div>
            </div>
        </div>
    );
}

