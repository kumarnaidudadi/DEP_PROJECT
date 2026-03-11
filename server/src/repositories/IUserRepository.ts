// ─── IUserRepository ─────────────────────────────────────────────────────────
// Interface for the user data access layer. Covers all user/auth DB operations.

export interface IUserRepository {
    findByEmail(email: string): Promise<any | null>;
    findById(id: number): Promise<any | null>;
    create(data: object): Promise<any>;
    updateOtp(email: string, otp: string | null, expiry: Date | null): Promise<void>;

    // ── Roles ──────────────────────────────────────────────────────────────
    findDefaultRole(): Promise<any | null>;
    assignRole(userId: number, roleId: number): Promise<void>;
}
