// ─── otpService.test.ts ───────────────────────────────────────────────────────
// Tests OtpService business logic.
// Prisma, ActivityLogService, and AccountNotificationService are all mocked.
//
// Coverage:
//   sendOtp   — user not found, inactive, 6-digit OTP stored, email attempted
//   verifyOtp — success, wrong OTP (1st attempt), warning at 2nd attempt,
//               deactivation at 3rd attempt, expired OTP, inactive account

import { OtpService } from '../services/OtpService';

// ── Mock nodemailer ───────────────────────────────────────────────────────────
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({}),
    }),
}));

// ── Mock AccountNotificationService ──────────────────────────────────────────
jest.mock('../services/AccountNotificationService', () => ({
    AccountNotificationService: jest.fn().mockImplementation(() => ({
        sendAccountBlockedEmail: jest.fn().mockResolvedValue(undefined),
    })),
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────
const mockPrisma = {
    users: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
};

// ── ActivityLogService mock ───────────────────────────────────────────────────
const mockActivityLog = {
    logAction: jest.fn().mockResolvedValue(undefined),
};

// ── Fixture ───────────────────────────────────────────────────────────────────
const activeUser = {
    id: 1,
    email: 'test@iitropar.ac.in',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    otp_code: '654321',
    otp_expiry: new Date(Date.now() + 5 * 60 * 1000),
    otp_attempts: 0,
};

let service: OtpService;

beforeEach(() => {
    jest.clearAllMocks();
    service = new OtpService(mockPrisma as any, mockActivityLog as any);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('OtpService.sendOtp()', () => {

    test('should throw ACCESS_DENIED when user does not exist', async () => {
        mockPrisma.users.findUnique.mockResolvedValue(null);

        await expect(service.sendOtp('nobody@iitropar.ac.in')).rejects.toThrow('ACCESS_DENIED');
    });

    test('should throw ACCOUNT_INACTIVE when user is deactivated', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, is_active: false });

        await expect(service.sendOtp('test@iitropar.ac.in')).rejects.toThrow('ACCOUNT_INACTIVE');
    });

    test('should save a 6-digit OTP with future expiry to the database', async () => {
        mockPrisma.users.findUnique.mockResolvedValue(activeUser);
        mockPrisma.users.update.mockResolvedValue(activeUser);

        await service.sendOtp('test@iitropar.ac.in');

        const updateCall = mockPrisma.users.update.mock.calls[0][0];
        expect(updateCall.data.otp_code).toMatch(/^\d{6}$/);
        expect(updateCall.data.otp_expiry.getTime()).toBeGreaterThan(Date.now());
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('OtpService.verifyOtp()', () => {

    test('should return success:true when OTP is correct', async () => {
        mockPrisma.users.findUnique.mockResolvedValue(activeUser);
        mockPrisma.users.update.mockResolvedValue(activeUser);

        const result = await service.verifyOtp('test@iitropar.ac.in', '654321');

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        // otp_attempts should be reset to 0
        const updateCall = mockPrisma.users.update.mock.calls[0][0];
        expect(updateCall.data.otp_attempts).toBe(0);
    });

    test('should return success:false on first wrong attempt', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, otp_attempts: 0 });
        mockPrisma.users.update.mockResolvedValue({});

        const result = await service.verifyOtp('test@iitropar.ac.in', 'WRONG1');

        expect(result.success).toBe(false);
        expect(result.deactivated).toBeFalsy();
        expect(result.shouldWarn).toBeFalsy();
        // attempts should have been incremented to 1
        expect(mockPrisma.users.update.mock.calls[0][0].data.otp_attempts).toBe(1);
    });

    test('should return shouldWarn:true on second wrong attempt', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, otp_attempts: 1 });
        mockPrisma.users.update.mockResolvedValue({});

        const result = await service.verifyOtp('test@iitropar.ac.in', 'WRONG2');

        expect(result.success).toBe(false);
        expect(result.shouldWarn).toBe(true);
        expect(result.message).toContain('1 attempt remaining');
    });

    test('should deactivate account on third wrong attempt', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, otp_attempts: 2 });
        mockPrisma.users.update.mockResolvedValue({});

        const result = await service.verifyOtp('test@iitropar.ac.in', 'WRONG3');

        expect(result.success).toBe(false);
        expect(result.deactivated).toBe(true);
        // DB update should set is_active: false
        const updateCall = mockPrisma.users.update.mock.calls[0][0];
        expect(updateCall.data.is_active).toBe(false);
        // Activity log should record the deactivation
        expect(mockActivityLog.logAction).toHaveBeenCalledWith(
            activeUser.id,
            expect.stringContaining('3 failed'),
            'deactivated',
            'system'
        );
    });

    test('should throw OTP_EXPIRED when expiry is in the past', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({
            ...activeUser,
            otp_expiry: new Date(Date.now() - 1000), // expired
        });

        await expect(service.verifyOtp('test@iitropar.ac.in', '654321'))
            .rejects.toThrow('OTP_EXPIRED');
    });

    test('should throw NO_OTP_REQUESTED when no OTP code is stored', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, otp_code: null });

        await expect(service.verifyOtp('test@iitropar.ac.in', '654321'))
            .rejects.toThrow('NO_OTP_REQUESTED');
    });

    test('should return deactivated:true for inactive user without incrementing attempts', async () => {
        mockPrisma.users.findUnique.mockResolvedValue({ ...activeUser, is_active: false });

        const result = await service.verifyOtp('test@iitropar.ac.in', '654321');

        expect(result.success).toBe(false);
        expect(result.deactivated).toBe(true);
        expect(mockPrisma.users.update).not.toHaveBeenCalled(); // no DB write for inactive
    });

    test('should throw USER_NOT_FOUND when email is not registered', async () => {
        mockPrisma.users.findUnique.mockResolvedValue(null);

        await expect(service.verifyOtp('ghost@iitropar.ac.in', '111111'))
            .rejects.toThrow('USER_NOT_FOUND');
    });
});
