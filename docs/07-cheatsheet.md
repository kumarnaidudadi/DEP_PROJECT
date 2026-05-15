# LTMS Developer Cheatsheet

### Adding a New Backend API
- [ ] Add Prisma model to `schema.prisma`
- [ ] Run `npx prisma migrate dev --name <name>`
- [ ] Run `npx prisma generate`
- [ ] Create `server/src/dtos/<Feature>Dto.ts`
- [ ] Create `server/src/repositories/<Feature>Repository.ts`
- [ ] Create `server/src/services/<Feature>Service.ts`
- [ ] Create `server/src/controllers/<Feature>Controller.ts`
- [ ] Create `server/src/routes/<feature>.ts` (add auth + role guards)
- [ ] Mount route in `server/src/index.ts`
- [ ] Write integration test in `server/src/__tests__/<feature>.test.ts`

### Adding RBAC to an Endpoint
- [ ] Confirm the role exists in the `roles` table / `seed.ts`
- [ ] Import `checkRole` middleware from `authMiddleware.ts`
- [ ] Add to route: `router.get('/path', verifyToken, checkRole(['ROLE_NAME']), handler)`
- [ ] Test with a wrong role → expect 403 Forbidden
- [ ] Test with the correct role → expect 200 OK

### Adding a New Frontend Page
- [ ] Add interface to `client/types/index.ts`
- [ ] Create `client/services/<feature>Service.ts`
- [ ] Create `client/hooks/use<Feature>.ts`
- [ ] Create `client/components/dashboard/<Feature>.tsx`
- [ ] Create `client/app/dashboard/<feature>/page.tsx`
- [ ] Add nav item to `client/components/dashboard/Sidebar.tsx`

### Database Change Workflow
- [ ] Edit `schema.prisma`
- [ ] Run `npx prisma migrate dev --name <name>` (Local Development)
- [ ] Run `npx prisma generate`
- [ ] Update seed data if necessary: `npx prisma db seed`
- [ ] Run `npx prisma migrate deploy` (Production Deployment)

### Changing Backend / Frontend URLs
- [ ] Update `NEXT_PUBLIC_API_URL` in `client/.env`
- [ ] Update `PORT` and `FRONTEND_URL` in `server/.env`
- [ ] Update CORS allowed origins in `server/src/index.ts`
- [ ] Update Google OAuth redirect URIs in the Google Cloud Console
- [ ] Redeploy both services

### Test Commands
```bash
# Backend Tests
cd server && npm test
cd server && npm run test:coverage
cd server && npm run test:watch

```

### Security Scan Commands
```bash
# Check dependencies
cd server && npm audit

# Static code analysis
semgrep --config=p/nodejs-security server/src/

# Secrets detection
gitleaks detect --source . -v
```

### Key File Locations

| What | Where |
|------|-------|
| Route registration | `server/src/index.ts` |
| Auth & RBAC middleware | `server/src/middleware/authMiddleware.ts` |
| Prisma schema | `server/prisma/schema.prisma` |
| API Axios instance | `client/lib/api.ts` |
| Shared types | `client/types/index.ts` |
| Environment variables | `server/.env` + `client/.env` |
| Sidebar nav | `client/components/dashboard/Sidebar.tsx` |
