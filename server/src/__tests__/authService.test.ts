// ─── authService.test.ts ───────────────────────────────────────────────────────
// Tests AuthService business logic.
// IUserRepository is mocked — no database access.
// nodemailer and google-auth-library are mocked — no network calls.
//
// Coverage:
//   register  — new user, duplicate email
//   login     — valid credentials, wrong password, no user, inactive
//   sendOtp   — user not found, inactive, saves otp + sends email
//   verifyOtp — success, wrong otp, expired otp, no otp requested, inactive
//   googleLogin — valid token, unregistered email

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';

// ── Mock nodemailer ───────────────────────────────────────────────────────────
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    }),
}));

// ── Mock google-auth-library ──────────────────────────────────────────────────
const mockGetPayload = jest.fn();
const mockVerifyIdToken = jest.fn().mockResolvedValue({ getPayload: mockGetPayload });
jest.mock('google-auth-library', () => ({
    OAuth2Client: jest.fn().mockImplementation(() => ({
        verifyIdToken: mockVerifyIdToken,
    })),
}));

// ── Mock IUserRepository ──────────────────────────────────────────────────────
const mockUserRepo = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateOtp: jest.fn(),
    findDefaultRole: jest.fn(),
    assignRole: jest.fn(),
};

// ── Shared fixture ────────────────────────────────────────────────────────────
const activeUser = {
    id: 1,
    email: 'test@iitropar.ac.in',
    first_name: 'Test',
    last_name: 'User',
    password: bcrypt.hashSync('correct-password', 10),
    is_active: true,
    otp_code: '123456',
    otp_expiry: new Date(Date.now() + 5 * 60 * 1000), // 5 min in future
    otp_attempts: 0,
    user_roles: [{ roles: { name: 'APPLICANT' } }],
};

let service: AuthService;

beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'testsecret';
    service = new AuthService(mockUserRepo as any);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.register()', () => {

    test('should register a new user and return a valid JWT + user info', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null); // no existing user
        mockUserRepo.create.mockResolvedValue({
            id: 10,
            email: 'new@iitropar.ac.in',
            first_name: 'New',
            last_name: 'User',
        });

        const result = await service.register({
            first_name: 'New',
            last_name: 'User',
            email: 'new@iitropar.ac.in',
            password: 'password123',
        });

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe('new@iitropar.ac.in');
        expect(result.user.name).toBe('New User');
        // Token should be decodable
        const decoded = jwt.verify(result.token, 'testsecret') as any;
        expect(decoded.userId).toBe(10);
    });

    test('should throw USER_ALREADY_EXISTS when email is taken', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);

        await expect(service.register({
            first_name: 'Dup',
            last_name: 'User',
            email: 'test@iitropar.ac.in',
            password: 'any',
        })).rejects.toThrow('USER_ALREADY_EXISTS');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.login()', () => {

    test('should return JWT and user when credentials are correct', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);

        const result = await service.login({
            email: 'test@iitropar.ac.in',
            password: 'correct-password',
        });

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe('test@iitropar.ac.in');
        expect(result.user.roles).toContain('APPLICANT');
        const decoded = jwt.verify(result.token, 'testsecret') as any;
        expect(decoded.roles).toContain('APPLICANT');
    });

    test('should throw INVALID_CREDENTIALS when password is wrong', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);

        await expect(service.login({
            email: 'test@iitropar.ac.in',
            password: 'wrong-password',
        })).rejects.toThrow('INVALID_CREDENTIALS');
    });

    test('should throw ACCESS_DENIED when user does not exist', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        await expect(service.login({
            email: 'ghost@iitropar.ac.in',
            password: 'any',
        })).rejects.toThrow('ACCESS_DENIED');
    });

    test('should assign default APPLICANT role when user has no roles', async () => {
        const userNoRoles = { ...activeUser, user_roles: [] };
        mockUserRepo.findByEmail.mockResolvedValue(userNoRoles);
        mockUserRepo.findDefaultRole.mockResolvedValue({ id: 1, name: 'APPLICANT' });
        mockUserRepo.assignRole.mockResolvedValue(undefined);

        const result = await service.login({
            email: 'test@iitropar.ac.in',
            password: 'correct-password',
        });

        expect(mockUserRepo.findDefaultRole).toHaveBeenCalled();
        expect(mockUserRepo.assignRole).toHaveBeenCalledWith(1, 1);
        expect(result.user.roles).toContain('APPLICANT');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.sendOtp()', () => {

    test('should throw ACCESS_DENIED when email is not registered', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        await expect(service.sendOtp('ghost@iitropar.ac.in')).rejects.toThrow('ACCESS_DENIED');
    });

    test('should throw ACCOUNT_INACTIVE when user is deactivated', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ ...activeUser, is_active: false });

        await expect(service.sendOtp('test@iitropar.ac.in')).rejects.toThrow('ACCOUNT_INACTIVE');
    });

    test('should save OTP to repo when user is valid and active', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);
        mockUserRepo.updateOtp.mockResolvedValue(undefined);

        await service.sendOtp('test@iitropar.ac.in');

        // updateOtp should be called with: email, a 6-digit string, a future Date
        expect(mockUserRepo.updateOtp).toHaveBeenCalledTimes(1);
        const [calledEmail, calledOtp, calledExpiry] = mockUserRepo.updateOtp.mock.calls[0];
        expect(calledEmail).toBe('test@iitropar.ac.in');
        expect(calledOtp).toMatch(/^\d{6}$/);
        expect(calledExpiry.getTime()).toBeGreaterThan(Date.now());
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.verifyOtp()', () => {

    test('should return JWT when OTP matches and is within expiry', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);
        mockUserRepo.updateOtp.mockResolvedValue(undefined);

        const result = await service.verifyOtp('test@iitropar.ac.in', '123456');

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe('test@iitropar.ac.in');
        // OTP should be cleared after success
        expect(mockUserRepo.updateOtp).toHaveBeenCalledWith('test@iitropar.ac.in', null, null);
    });

    test('should throw INVALID_OTP when OTP does not match', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);

        await expect(service.verifyOtp('test@iitropar.ac.in', '999999'))
            .rejects.toThrow('INVALID_OTP');
    });

    test('should throw OTP_EXPIRED when expiry is in the past', async () => {
        const expiredUser = {
            ...activeUser,
            otp_expiry: new Date(Date.now() - 1000), // 1 second ago
        };
        mockUserRepo.findByEmail.mockResolvedValue(expiredUser);

        await expect(service.verifyOtp('test@iitropar.ac.in', '123456'))
            .rejects.toThrow('OTP_EXPIRED');
    });

    test('should throw NO_OTP_REQUESTED when no OTP has been sent', async () => {
        const noOtpUser = { ...activeUser, otp_code: null };
        mockUserRepo.findByEmail.mockResolvedValue(noOtpUser);

        await expect(service.verifyOtp('test@iitropar.ac.in', '123456'))
            .rejects.toThrow('NO_OTP_REQUESTED');
    });

    test('should throw ACCOUNT_INACTIVE for deactivated user', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ ...activeUser, is_active: false });

        await expect(service.verifyOtp('test@iitropar.ac.in', '123456'))
            .rejects.toThrow('ACCOUNT_INACTIVE');
    });

    test('should throw USER_NOT_FOUND for unregistered email', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        await expect(service.verifyOtp('ghost@iitropar.ac.in', '123456'))
            .rejects.toThrow('USER_NOT_FOUND');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AuthService.googleLogin()', () => {

    test('should return JWT when Google token is valid and user exists', async () => {
        process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
        mockGetPayload.mockReturnValue({ email: 'test@iitropar.ac.in' });
        mockUserRepo.findByEmail.mockResolvedValue(activeUser);

        const result = await service.googleLogin('valid-google-id-token');

        expect(result.token).toBeDefined();
        expect(result.user.email).toBe('test@iitropar.ac.in');
        expect(result.user.roles).toContain('APPLICANT');
    });

    test('should throw ACCESS_DENIED when Google email is not registered in system', async () => {
        mockGetPayload.mockReturnValue({ email: 'external@gmail.com' });
        mockUserRepo.findByEmail.mockResolvedValue(null);

        await expect(service.googleLogin('some-token')).rejects.toThrow('ACCESS_DENIED');
    });

    test('should throw INVALID_GOOGLE_TOKEN when payload has no email', async () => {
        mockGetPayload.mockReturnValue({ email: null });

        await expect(service.googleLogin('bad-token')).rejects.toThrow('INVALID_GOOGLE_TOKEN');
    });
});
