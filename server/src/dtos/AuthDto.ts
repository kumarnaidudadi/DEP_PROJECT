// ─── Auth Data Transfer Objects ──────────────────────────────────────────────
// Typed input/output shapes for the authentication domain.

export interface RegisterDto {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResultDto {
    token: string;
    user: {
        id: number;
        email: string;
        name: string;
        roles: string[];
    };
}
