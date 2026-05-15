# Security Guide

## 6.1 Authentication Security Audit

### Current Authentication Mechanisms

1. **JWT (JSON Web Tokens)**:
   - **Status**: Implemented in `server/src/services/AuthService.ts`.
   - **Configuration**: Uses `jsonwebtoken` with the HS256 algorithm (default). Expiry is hardcoded to `1d` (1 day).
   - **Gaps Identified**:
     - No Refresh Token strategy exists. If the token expires, the user is abruptly logged out.
     - Secret strength depends entirely on the `.env` file `JWT_SECRET`.
   - **Recommendation**: Implement short-lived access tokens (e.g., 15m) and HTTP-only cookie-based refresh tokens (e.g., 7d).

2. **OTP (One-Time Password)**:
   - **Status**: Implemented in `server/src/services/AuthService.ts`.
   - **Configuration**: Generates a 6-digit numeric code valid for 5 minutes.
   - **Replay Prevention**: Handled correctly. OTP is set to `null` in the database immediately upon successful verification.
   - **Gaps Identified**:
     - No explicit rate-limiting on the `POST /api/auth/send-otp` or `POST /api/auth/verify-otp` endpoints. This allows brute-force attacks against the 6-digit code.
   - **Recommendation**: Implement `express-rate-limit` immediately on these routes.

3. **Google OAuth**:
   - **Status**: Implemented using official `google-auth-library`.
   - **Configuration**: Properly uses `verifyIdToken` to validate the token cryptographically against Google's public keys and asserts the `audience` matches the `GOOGLE_CLIENT_ID`.
   - **Security**: Robust. Only issues local JWTs if the Google email matches an already registered user in the database.

---

## 6.2 Security Checks — Commands to Run

### Dependency Vulnerability Scanning
Regularly audit your dependencies for known CVEs.
```bash
# Audit backend dependencies
cd server && npm audit

# Audit with automatic fix attempt (run tests after doing this)
cd server && npm audit fix

# Audit frontend dependencies
cd client && npm audit

# Generate full audit report as JSON (useful for CI/CD)
cd server && npm audit --json > audit-report.json
```

### Static Analysis / Linting for Security
To catch insecure code patterns (e.g., hardcoded secrets, `eval()` usage, prototype pollution):
```bash
# Install semgrep globally
brew install semgrep # macOS
# OR
pip install semgrep

# Scan the Node.js backend using standard security rules
semgrep --config=p/nodejs-security server/src/
```

### Secrets Detection
Prevent accidental commits of API keys or JWT secrets to the repository:
```bash
# Scan the repository history using gitleaks (requires gitleaks installed)
gitleaks detect --source . -v

# Alternatively, using truffleHog via Docker
docker run --rm -v "$PWD:/repo" trufflesecurity/trufflehog:latest filesystem /repo
```

### Prisma / Database Security
- **Parameterised Queries**: Prisma Client automatically parameterises all standard queries (e.g., `prisma.users.findUnique(...)`). This inherently prevents SQL injection attacks.
- **Raw Queries**: If you ever use `$queryRaw` or `$executeRaw`, you must use tagged template literals (e.g., `` prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}` ``). Never concatenate strings into raw queries. Check the codebase for any unsafe raw query usage.

---

## 6.3 RBAC Implementation Guide

### Understanding the Current RBAC Model
- **Storage**: Defined in the `roles` table. Users are mapped to roles via the `user_roles` join table.
- **Middleware Extraction**: `verifyToken` (in `server/src/middleware/authMiddleware.ts`) extracts the `roles` array from the JWT payload and attaches it to `req.user.roles`.

### Applying RBAC to Endpoints

The `checkRole` middleware is exported from `authMiddleware.ts`.

#### Pattern 1: Single Role Required
```typescript
import { verifyToken, checkRole } from '../middleware/authMiddleware';

router.get('/admin/dashboard', verifyToken, checkRole(['ADMIN']), controller.getAdminData);
```

#### Pattern 2: Multiple Roles Allowed
Allows access if the user has *at least one* of the specified roles.
```typescript
router.get('/reports', verifyToken, checkRole(['ADMIN', 'SUPER_ADMIN', 'HOD']), controller.getReports);
```

#### Pattern 3: Hierarchy-Based (Custom Middleware)
Because `hierarchy_level` exists in the `roles` schema, you can write a custom middleware to allow actions based on level (e.g., Level 5 can approve anything Level 4 can).
```typescript
// server/src/middleware/requireHierarchy.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import prisma from '../prisma';

export function requireMinHierarchy(minLevel: number) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const userRoles = req.user?.roles || [];
        
        const rolesData = await prisma.roles.findMany({
            where: { name: { in: userRoles } },
            select: { hierarchy_level: true }
        });

        const maxLevel = Math.max(...rolesData.map(r => r.hierarchy_level || 0));

        if (maxLevel < minLevel) {
            res.status(403).json({ error: 'Access denied. Insufficient hierarchy level.' });
            return;
        }
        next();
    };
}
```

### Acting-Role Delegation
In the LTMS, users can delegate their authority to others (e.g., a Director delegating to a Dean while on leave). 
- **How it works**: Handled by `server/src/services/ActingRoleService.ts`. The physical user (Actor) logs in, but actions are attributed to the `target_user_id` (Requester).
- **Security Implications**: Do not rely solely on the JWT `roles` array if `actingForUserId` is passed in the request body/query. The Controller must verify the active delegation record in the `acting_role_requests` table before allowing the action (as seen in `FormController.ts` -> `updateFormStatus`).

### RBAC on the Frontend
Use the `useAuth` hook to conditionally render UI elements so unauthorized users cannot even see the buttons.
```tsx
import { useAuth } from '@/hooks/useAuth';

export default function AdminPanel() {
    const { userRoles } = useAuth();
    const isAdmin = userRoles.includes('ADMIN');

    if (!isAdmin) return <div>Access Denied</div>;

    return <button>Delete System Data</button>;
}
```

---

## 6.4 Additional Security Hardening Recommendations

Add the following to `server/src/index.ts` to harden the Express application.

1. **Helmet.js**
   - **Purpose**: Sets secure HTTP headers (e.g., X-XSS-Protection, Content-Security-Policy).
   - **Package**: `npm install helmet`
   - **Setup**: `app.use(helmet());`

2. **Express Rate Limit**
   - **Purpose**: Prevents brute-force attacks, especially critical for OTP routes.
   - **Package**: `npm install express-rate-limit`
   - **Setup**:
     ```typescript
     import rateLimit from 'express-rate-limit';
     const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many requests" });
     app.use('/api/auth/', authLimiter);
     ```

3. **Strict CORS**
   - **Purpose**: Prevent unauthorized domains from making API requests. Currently, CORS is set to allow all origins dynamically.
   - **Setup**:
     ```typescript
     app.use(cors({
         origin: process.env.FRONTEND_URL || 'http://localhost:3000',
         credentials: true,
     }));
     ```

4. **Input Validation (Zod)**
   - **Purpose**: Ensure incoming Request Body data matches expected types before hitting the database.
   - **Package**: `npm install zod`

5. **HTTPS Enforcement**
   - **Purpose**: Ensure data is encrypted in transit.
   - **Setup**: If deploying on Render/Vercel, HTTPS is handled at the load balancer level. If self-hosting, configure Nginx to terminate SSL and proxy traffic to port 4000.

---

## 6.5 Security Checklist (Pre-Deployment)

- [ ] `npm audit` returns 0 high/critical vulnerabilities.
- [ ] No secrets in `.env` files are committed to git (check `.gitignore`).
- [ ] `JWT_SECRET` in production is a minimum 32-character random string.
- [ ] Rate limiting is applied to `/api/auth/send-otp` and `/api/auth/verify-otp`.
- [ ] Helmet.js headers are enabled in `index.ts`.
- [ ] CORS `origin` is restricted to known frontend domain(s) in production instead of dynamic wildcards.
- [ ] All protected routes have the `verifyToken` middleware applied.
- [ ] The `checkRole` guard is applied to all admin-only endpoints.
- [ ] `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` is removed or strictly isolated to development environments.
- [ ] The codebase contains no raw string concatenation in Prisma `$queryRaw` statements.
