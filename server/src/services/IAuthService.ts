// ─── IAuthService ─────────────────────────────────────────────────────────────
// Interface for all authentication business logic.

import { RegisterDto, LoginDto, AuthResultDto } from '../dtos/AuthDto';

export interface IAuthService {
    register(dto: RegisterDto): Promise<AuthResultDto>;
    login(dto: LoginDto): Promise<AuthResultDto>;
    googleLogin(idToken: string): Promise<AuthResultDto>;
    sendOtp(email: string): Promise<void>;
    verifyOtp(email: string, otp: string): Promise<AuthResultDto>;
}
