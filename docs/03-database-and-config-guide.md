# Database & Connection Configuration Guide

## 3.1 Database Connection Setup

### Two URL Variables
Prisma is configured to use two distinct environment variables for connecting to the database, particularly when using managed services like Supabase:
- **`DATABASE_URL`**: Used by the Prisma Client at runtime for executing queries. This URL should point to the connection pooler (e.g., PgBouncer on port 6543 for Supabase) to efficiently handle many short-lived connections.
- **`DIRECT_URL`**: Used exclusively by Prisma CLI tools (like `prisma migrate dev` or `prisma db push`) to perform structural changes to the database. This must be a direct connection bypassing any poolers (usually port 5432).

### Connecting to a New PostgreSQL Database
1. Update `DATABASE_URL` and `DIRECT_URL` in `server/.env`.
2. Run migrations to create the schema in the new database:
   ```bash
   cd server
   npx prisma migrate dev --name init
   ```
3. Seed the database with reference data (roles, etc.):
   ```bash
   npx prisma db seed
   ```

### Connecting to Supabase Specifically
When setting up a Supabase project:
1. Navigate to your Supabase project dashboard → **Project Settings** → **Database**.
2. **Transaction Pooler URL**: Copy the "Connection pooling" URL (make sure it says port 6543 and `?pgbouncer=true`). Set this as your `DATABASE_URL` in `server/.env`.
3. **Session URL (Direct)**: Copy the "Session" or direct connection string (port 5432). Set this as your `DIRECT_URL`.
4. **SSL Caveat**: Supabase enforces SSL. If you encounter certificate validation errors locally, the backend codebase includes `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';` at the very top of `server/src/index.ts` to bypass self-signed cert issues during development. (Do not use this in a strict production environment without providing proper CA certs).

### Switching to a Self-Hosted PostgreSQL Instance
If migrating off Supabase to local Postgres:
1. In `server/.env`, set both `DATABASE_URL` and `DIRECT_URL` to the exact same local connection string (e.g., `postgresql://user:pass@localhost:5432/dep_project`).
2. If your self-hosted instance doesn't use SSL, ensure `?sslmode=disable` or appropriate flags are appended if needed.
3. Remove `NODE_TLS_REJECT_UNAUTHORIZED = '0';` from `index.ts` if not needed.

### Inspecting the Database Locally
To open a GUI and view your current database state (tables, records):
```bash
cd server
npx prisma studio
```
This opens Prisma Studio at `http://localhost:5555`.

---

## 3.2 Changing the Backend URL

If you need to move the backend to a new domain or port, update the following:
1. **Backend Port**: Update `PORT=...` in `server/.env` (default is 4000).
2. **Frontend Target**: Update `NEXT_PUBLIC_API_URL=http://<new-domain-or-ip>:4000/api` in `client/.env`.
3. **CORS Allowlist**: The current CORS config in `server/src/index.ts` dynamically allows all origins. If you tighten this for production, ensure the new frontend URL is added to the allowed origins list in the `cors()` middleware options.

---

## 3.3 Changing the Frontend URL

When moving the frontend to a new domain (e.g., `https://my-ltms.app`):
1. **Backend CORS Setup**: Ensure the new domain is permitted by the backend CORS configuration (`server/src/index.ts`).
2. **Backend ENV Var**: Update `FRONTEND_URL=https://my-ltms.app` in `server/.env`. This is used by the `EmailService` to generate clickable links in email notifications.
3. **Google OAuth Console**: 
   - Go to Google Cloud Console → APIs & Services → Credentials.
   - Edit your OAuth 2.0 Client ID.
   - Add the new frontend URL to **Authorized JavaScript origins**.
   - Add the new frontend URL (e.g., `https://my-ltms.app/login`) to **Authorized redirect URIs**.

---

## 3.4 Environment Variable Reference

### Server (`server/.env`)
| Variable | Required | Purpose | Example Value | Where It's Used in Code |
|----------|----------|---------|---------------|-------------------------|
| `DATABASE_URL` | Yes | Connection pooler URL for Prisma Client | `postgresql://user:pass@host:6543/db?pgbouncer=true` | Prisma runtime |
| `DIRECT_URL` | Yes | Direct DB URL for Prisma migrations | `postgresql://user:pass@host:5432/db` | Prisma CLI (`migrate`, `seed`) |
| `SUPABASE_URL` | No | Supabase specific API URL | `https://xyz.supabase.co` | (Reference/Future integrations) |
| `SUPABASE_KEY` | No | Supabase anon/service key | `eyJhb...` | (Reference/Future integrations) |
| `PORT` | Yes | Port the Express server listens on | `4000` | `server/src/index.ts` |
| `HOST` | Yes | Host binding address | `0.0.0.0` | `server/src/index.ts` |
| `FRONTEND_URL` | Yes | URL for email notification links | `http://localhost:3000` | `server/src/services/FormService.ts` |
| `PORTAL_URL` | No | Secondary portal URL reference | `http://localhost:3000` | (Various) |
| `JWT_SECRET` | Yes | Secret key for signing Auth tokens | `G4/q9...` | `server/src/middleware/authMiddleware.ts` |
| `GOOGLE_CLIENT_ID` | Yes | Google Auth App ID | `123...apps.googleusercontent.com` | `server/src/controllers/AuthController.ts` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Auth App Secret | `GOCSPX-...` | (OAuth verification) |
| `EMAIL_USER` / `SMTP_USER` | Yes | Email address for sending mail | `admin@gmail.com` | `server/src/services/EmailService.ts` |
| `EMAIL_PASS` / `SMTP_PASS` | Yes | App password for SMTP auth | `abcd1234efgh` | `server/src/services/EmailService.ts` |
| `EMAIL_FROM` | Yes | Display name and sender address | `"LTMS Portal <admin@gmail.com>"` | `server/src/services/EmailService.ts` |
| `SMTP_HOST` | Yes | SMTP server address | `smtp.gmail.com` | `server/src/services/EmailService.ts` |
| `SMTP_PORT` | Yes | SMTP server port | `587` | `server/src/services/EmailService.ts` |
| `SIGNATURE_ENCRYPTION_KEY` | Yes | 32-byte key for encrypting signatures | `a1b2c3...` | `server/src/services/EncryptionService.ts` |

### Client (`client/.env`)
| Variable | Required | Purpose | Example Value | Where It's Used in Code |
|----------|----------|---------|---------------|-------------------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google Auth Client ID | `123...apps.googleusercontent.com` | Client login component |
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for backend API requests | `http://localhost:4000/api` | `client/lib/api.ts` |

---

## 3.5 Database Extension Conventions

### Adding a New Model
1. Edit `server/prisma/schema.prisma`.
2. Name the model in plural `snake_case` (e.g., `holiday_calendar`).
3. Name fields in `snake_case`. Always include an `id Int @id @default(autoincrement())`.
4. Run migrations locally to apply changes.

### Migration Workflow
**Never edit SQL migration files manually** once they are created. Prisma manages state via the `_prisma_migrations` table.
- **Local Development:** 
  Use `migrate dev` to apply schema changes to your local DB and generate a migration file.
  ```bash
  npx prisma migrate dev --name <descriptive_name>
  ```
- **Production Deployment:**
  Use `migrate deploy` to apply already-generated migration files to a production database. Do not use `dev` in production.
  ```bash
  npx prisma migrate deploy
  ```

### Seed Data
If a new feature requires reference data (e.g., a new system role):
1. Open `server/prisma/seed.ts`.
2. Add an `upsert` block to insert the data without failing on subsequent runs.
3. Run `npx prisma db seed` to apply it to your local environment.
