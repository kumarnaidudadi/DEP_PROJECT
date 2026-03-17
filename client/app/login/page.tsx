'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Button, Input, Label } from '@/components/ui';
import { Loader2, AlertCircle, Mail, KeyRound, ShieldCheck, ChevronRight } from 'lucide-react';
import { sendOtp, verifyOtp, googleLogin } from '@/services/authService';

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
            await sendOtp(email);
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
            const { token, user } = await verifyOtp(email, otp);

            // Store session
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to unified dashboard (it handles roles internally)
            router.push('/dashboard/all');
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
            const { token, user } = await googleLogin(credentialResponse.credential);

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirect to unified dashboard (it handles roles internally)
            router.push('/dashboard/all');
        } catch (err: any) {
            console.error('Google login failed:', err);
            const errorMessage = err.response?.data?.error || 'Google login failed';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative bg-gray-900">
            {/* Full-bleed Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000"
                style={{ backgroundImage: "url('/login-bg.jpg.jpeg')" }}
            />
            {/* Dark overlay to make the bright card pop and ensure readability */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

            {/* Centered Login Card */}
            <div className="w-full max-w-[480px] flex flex-col relative z-10 mx-4 bg-white/95 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] px-8 py-10 sm:px-12 sm:py-12 border border-white/40">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="p-1.5 bg-white rounded border border-gray-200 shadow-sm flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-gray-800" />
                    </div>
                    <span className="font-extrabold text-xl tracking-tighter text-gray-900">LTMS</span>
                </div>

                {/* Content */}
                <div className="flex-1 w-full flex flex-col space-y-6">
                    <div className="text-center">
                        <h1 className="text-[2.25rem] leading-tight font-extrabold tracking-tight text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-[#6C757D] font-medium text-[14px] mb-6">LTMS Portal Access • Leave & Travel Management</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-md flex items-center gap-2 text-sm justify-center">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {step === 'email' ? (
                        <form onSubmit={handleSendOtp} className="space-y-5">
                            <div className="space-y-2.5">
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
                                        className="pl-12 h-14 bg-white border border-gray-200 shadow-sm rounded-xl text-[15px] text-black focus:ring-2 focus:ring-blue-500 font-medium placeholder:font-normal placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1A62FF] hover:bg-blue-700 text-white font-semibold py-2 rounded-xl h-14 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
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
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="space-y-2.5">
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
                                        className="pl-12 h-14 bg-white border border-gray-200 shadow-sm rounded-xl text-xl text-black tracking-widest focus:ring-2 focus:ring-blue-500 font-medium text-center tracking-[0.5em]"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1A62FF] hover:bg-blue-700 text-white font-semibold py-2 rounded-xl h-14 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
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
                    <div className="relative pt-4 pb-2">
                        <div className="absolute inset-0 flex items-center pt-2">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="bg-white px-3 text-[#B0ADAC]">
                                Quick Access
                            </span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <div className="flex justify-center w-full">
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


            </div>
        </div>
    );
}
