// ─── authMiddleware.test.ts ────────────────────────────────────────────────────
// Tests the verifyToken and checkRole middleware functions.
// No DB connection needed — all Prisma calls are mocked.
//
// Coverage:
//   verifyToken  — missing header, malformed header, invalid token, valid token
//   checkRole    — user has role, user missing role, no user on request
//   inactiveUserGuard — active user passes, inactive user returns 403

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, checkRole, AuthenticatedRequest } from '../middleware/authMiddleware';

// ── Mock prisma so inactiveUserGuard doesn't hit real DB ──────────────────────
jest.mock('../prisma', () => ({
    __esModule: true,
    default: {
        users: {
            findUnique: jest.fn(),
        },
    },
}));

import prisma from '../prisma';

const SECRET = 'supersecretkey';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRes() {
    const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res as Response;
}

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
    return {
        headers: {},
        ...overrides,
    } as AuthenticatedRequest;
}

const next = jest.fn();

// ─────────────────────────────────────────────────────────────────────────────
describe('verifyToken middleware', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.JWT_SECRET; // use default 'supersecretkey'
    });

    test('should return 401 when Authorization header is missing', () => {
        const req = makeReq({ headers: {} });
        const res = makeRes();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: expect.stringContaining('No token') });
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when Authorization header does not start with Bearer', () => {
        const req = makeReq({ headers: { authorization: 'Basic sometoken' } });
        const res = makeRes();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 for an expired or tampered token', () => {
        const req = makeReq({ headers: { authorization: 'Bearer invalidtoken123' } });
        const res = makeRes();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ error: expect.stringContaining('Invalid') });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next() and attach decoded user when token is valid', () => {
        const payload = { userId: 42, email: 'user@iitropar.ac.in', roles: ['APPLICANT'] };
        const token = jwt.sign(payload, SECRET);
        const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
        const res = makeRes();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toMatchObject({ userId: 42, email: 'user@iitropar.ac.in', roles: ['APPLICANT'] });
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should attach all roles from token payload', () => {
        const token = jwt.sign({ userId: 1, email: 'admin@iitropar.ac.in', roles: ['ADMIN', 'APPROVER'] }, SECRET);
        const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
        const res = makeRes();

        verifyToken(req, res, next);

        expect(req.user?.roles).toEqual(['ADMIN', 'APPROVER']);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkRole middleware', () => {

    function makeAuthedReq(roles: string[]): AuthenticatedRequest {
        return makeReq({ user: { userId: 1, email: 'test@test.com', roles } });
    }

    test('should call next() when user has the required role', () => {
        const guard = checkRole(['ADMIN']);
        const req = makeAuthedReq(['ADMIN']);
        const res = makeRes();

        guard(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should call next() when user has one of multiple allowed roles', () => {
        const guard = checkRole(['ADMIN', 'APPROVER']);
        const req = makeAuthedReq(['APPROVER']);
        const res = makeRes();

        guard(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    test('should return 403 when user lacks required role', () => {
        const guard = checkRole(['ADMIN']);
        const req = makeAuthedReq(['APPLICANT']);
        const res = makeRes();

        guard(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when user has no roles at all', () => {
        const guard = checkRole(['ADMIN']);
        const req = makeAuthedReq([]);
        const res = makeRes();

        guard(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('inactiveUserGuard middleware', () => {
    const { inactiveUserGuard } = require('../../middleware/authMiddleware');

    test('should call next() when user is active', async () => {
        (prisma.users.findUnique as jest.Mock).mockResolvedValue({ is_active: true });
        const req = makeReq({ user: { userId: 5, email: 'a@b.com', roles: [] } });
        const res = makeRes();

        await inactiveUserGuard(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 403 when user is inactive', async () => {
        (prisma.users.findUnique as jest.Mock).mockResolvedValue({ is_active: false });
        const req = makeReq({ user: { userId: 5, email: 'a@b.com', roles: [] } });
        const res = makeRes();

        await inactiveUserGuard(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({ inactive: true });
        expect(next).not.toHaveBeenCalled();
    });

    test('should call next() when no user is attached (unauthenticated request)', async () => {
        const req = makeReq({ user: undefined });
        const res = makeRes();

        await inactiveUserGuard(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
