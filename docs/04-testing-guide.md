# Testing Guide

## 4.1 Existing Test Setup Discovery

**Backend:**
- **Test Framework**: Jest is installed and configured (`jest.config.ts`). Supertest is also installed for HTTP assertions.
- **Existing Tests**: Found in `server/src/__tests__/`. Includes tests for `authMiddleware.test.ts`, `authService.test.ts`, `formService.test.ts`, and `otpService.test.ts`. 
- **Package Scripts**: `npm test`, `npm run test:coverage`, `npm run test:watch` are configured in `server/package.json`.

**Frontend:**
- **Test Framework**: No testing frameworks are currently configured.
- **Existing Tests**: None.

---

## 4.2 Backend Unit Testing

### Service Layer Tests
When testing the Service layer, mock the Repository to isolate the business logic.

**Mocking the Repository:**
```typescript
// Example using jest-mock-extended or manual mocks
import { FormService } from '../services/FormService';
import { IFormRepository } from '../repositories/IFormRepository';
import { IEmailService } from '../services/IEmailService';

// Create manual mocks
const mockFormRepo: jest.Mocked<IFormRepository> = {
    findById: jest.fn(),
    findAll: jest.fn(),
    // ... mock other required methods
} as any;

const mockEmailService: jest.Mocked<IEmailService> = {
    sendEmailNotification: jest.fn(),
} as any;

const formService = new FormService(mockFormRepo, mockEmailService);
```

**Starter Template:**
```typescript
describe('FormService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return a form when found', async () => {
        mockFormRepo.findById.mockResolvedValue({ id: 1, status: 'pending' });
        const form = await formService.getFormById(1);
        expect(form).toBeDefined();
        expect(form.id).toBe(1);
    });

    it('should throw FORM_NOT_FOUND when missing', async () => {
        mockFormRepo.findById.mockResolvedValue(null);
        await expect(formService.getFormById(999)).rejects.toThrow('FORM_NOT_FOUND');
    });
});
```

### Repository Layer Tests
Repositories interact directly with the database. To test them safely without wiping development data, either:
1. Mock the Prisma Client using `jest-mock-extended`.
2. Use a dedicated test database (e.g., PostgreSQL in Docker) and tear it down after testing.

**Starter Template (Prisma Mock):**
```typescript
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { FormRepository } from '../repositories/FormRepository';

let prismaMock: DeepMockProxy<PrismaClient>;
let repo: FormRepository;

beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    repo = new FormRepository(prismaMock as unknown as PrismaClient);
});

it('should delete a form type', async () => {
    prismaMock.form_types.delete.mockResolvedValue({ id: 1 } as any);
    await repo.deleteFormType(1);
    expect(prismaMock.form_types.delete).toHaveBeenCalledWith({ where: { id: 1 } });
});
```

### Middleware Tests
Testing middleware like `authMiddleware.ts` involves mocking the Express Request/Response objects.

**Starter Template:**
```typescript
import { verifyToken, AuthenticatedRequest } from '../middleware/authMiddleware';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

it('should attach decoded user to request on valid token', () => {
    const token = jwt.sign({ userId: 1, roles: ['ADMIN'] }, process.env.JWT_SECRET || 'supersecretkey');
    const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const next: NextFunction = jest.fn();

    verifyToken(req, res, next);

    expect(req.user?.userId).toBe(1);
    expect(next).toHaveBeenCalled();
});
```

---

## 4.3 Backend Integration Testing (API / Route Tests)

Use Supertest to test the full route-controller-service-repository flow.

**Setup:**
1. Export the Express `app` without starting `app.listen()` in `index.ts`.
2. Authenticate by generating a valid JWT token.

**Starter Template:**
```typescript
import request from 'supertest';
import { app } from '../index'; // Ensure app is exported
import jwt from 'jsonwebtoken';

const generateToken = (role = 'USER') => {
    return jwt.sign({ userId: 1, email: 'test@test.com', roles: [role] }, process.env.JWT_SECRET || 'supersecretkey');
};

describe('GET /api/forms', () => {
    it('should return 401 if no token provided', async () => {
        const res = await request(app).get('/api/forms');
        expect(res.status).toBe(401);
    });

    it('should allow access with valid token', async () => {
        const token = generateToken();
        const res = await request(app)
            .get('/api/forms')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should deny access if lacking role', async () => {
        const token = generateToken('USER'); // Route requires ADMIN
        const res = await request(app)
            .get('/api/user-admin/users')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });
});
```

---

## 4.4 API Testing — Manual & Automated

### Manual Testing with Postman / cURL
1. **Obtain JWT**: Login via Google OAuth or OTP flow. Grab the `token` from browser `localStorage` or network response.
2. **Execute cURL**:
```bash
# Get all forms
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:4000/api/forms

# Download PDF
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" -o application.pdf http://localhost:4000/api/forms/1/download
```

### Automated API Contract Testing
Recommended Tool: **Bruno** (Open source API client) or **Postman**.
- Store collections alongside the codebase (e.g., `tests/api-collection/`).
- Define environment variables for `{{baseUrl}}` and `{{jwt}}`.
- Mirror your route structure: folders for `Auth`, `Forms`, `UserAdmin`, etc.



## 4.7 Test Commands Reference

```bash
# Run all backend tests
cd server && npm test

# Run backend tests with coverage report
cd server && npm run test:coverage

# Run specific test file in backend
cd server && npx jest src/__tests__/formService.test.ts

```


---

## 4.8 Testing Conventions

- **File Naming**: Use `<module>.test.ts` for backend logic, and `<component>.spec.tsx` for frontend components.
- **Describe Blocks**: Name the `describe` block after the Class or Module (`describe('FormService')`).
- **It Blocks**: Describe the expected behavior clearly (`it('should return 403 when role is missing')`).
- **Test the Interface**: Test public methods, inputs, and outputs. Do not write tests that break if private internal implementation details change.
- **Coverage**: Aim for 80% coverage on complex business logic (Services). 100% coverage on everything is not strictly necessary.
