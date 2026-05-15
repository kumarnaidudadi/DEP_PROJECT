# Backend API Extension Guide

## 1.1 Layered Architecture Overview

The LTMS backend follows a strict layered architecture to separate concerns. The full request lifecycle is:
**Route → Middleware → Controller → Service → Repository → Prisma → DB**

### Responsibility Rules
- **Route (`src/routes/`)**: Wires up dependencies, applies middleware (like `verifyToken` and `checkRole`), and maps HTTP endpoints to Controller methods. No business logic here.
- **Middleware (`src/middleware/`)**: Intercepts requests to verify authentication (`authMiddleware.ts`), check permissions, or perform other pre-processing. Attaches user info to `req.user`.
- **Controller (`src/controllers/`)**: Translates HTTP requests to Service calls and formats HTTP responses. Extracts `req.body`, `req.params`, `req.user`, wraps calls in `try/catch`, and sets HTTP status codes based on Service errors.
- **Service (`src/services/`)**: Contains **all** business logic, validation, email sending, and decision-making. Throws standard Error objects (e.g., `throw new Error('FORM_NOT_FOUND')`) to be caught by the Controller.
- **Repository (`src/repositories/`)**: The **only** layer that interacts with the database. Uses Prisma Client to execute queries. No business logic here.
- **DTO (`src/dtos/`)**: Data Transfer Objects (TypeScript interfaces) defining the shape of data passed between layers (e.g., `CreateFormDto`), ensuring decoupling.

### Request Flow Diagram
```text
Client Request
      │
      ▼
┌─────────────┐
│   Routes    │  <-- Route matching, applies Middleware
└──────┬──────┘
       │ (if valid)
       ▼
┌─────────────┐
│ Controllers │  <-- Extracts req data, calls Service, sends res
└──────┬──────┘
       │ (DTOs)
       ▼
┌─────────────┐
│  Services   │  <-- Business logic, validation, error throwing
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repositories│  <-- Prisma Client queries
└──────┬──────┘
       │
       ▼
    Database
```

### Flow of `req.user`
The `verifyToken` middleware extracts the JWT from the `Authorization: Bearer <token>` header, decodes it, and attaches the payload to `req.user`. The `AuthenticatedRequest` interface extends Express's `Request` to include:
```typescript
user?: {
    userId: number;
    email: string;
    roles: string[];
}
```
Controllers extract `userId` and `roles` from `req.user` and pass them down to Services.

---

## 1.2 Adding a New API — Complete Step-by-Step Walkthrough

Example: Adding `GET /api/notifications` and `POST /api/notifications/:id/mark-read`.

### Step 1 — Prisma Schema
- **Location:** `server/prisma/schema.prisma`
- **Naming Conventions:**
  - Models: snake_case, pluralized (e.g., `notifications`, `applied_forms`).
  - Fields: snake_case (e.g., `is_read`, `created_at`).
  - Relations: Use clear names, often referencing the target model name or relationship.
- **Migration & Generation:**
  ```bash
  npx prisma migrate dev --name add_notifications_table
  npx prisma generate
  ```
- **Seed Data:** Update `server/prisma/seed.ts` if the new feature requires default reference data (like new roles).

### Step 2 — DTO File
- **Location:** `server/src/dtos/NotificationDto.ts`
- **What to define:** Shapes for request bodies and cross-layer payloads.
```typescript
// server/src/dtos/NotificationDto.ts
export interface CreateNotificationDto {
    userId: number;
    message: string;
    type: string;
}

export interface MarkReadDto {
    notificationId: number;
    userId: number;
}
```

### Step 3 — Repository
- **Location:** `server/src/repositories/NotificationRepository.ts`
- **Import Style:** Import `PrismaClient` from `@prisma/client`.
- **Rule:** Only DB queries, returning raw Prisma results or mapping to clean objects.
```typescript
// server/src/repositories/NotificationRepository.ts
import { PrismaClient } from '@prisma/client';

export interface INotificationRepository {
    findByUserId(userId: number): Promise<any[]>;
    markAsRead(id: number, userId: number): Promise<any>;
}

export class NotificationRepository implements INotificationRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async findByUserId(userId: number): Promise<any[]> {
        return this.prisma.notifications.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'desc' }
        });
    }

    async markAsRead(id: number, userId: number): Promise<any> {
        return this.prisma.notifications.updateMany({
            where: { id, user_id: userId },
            data: { is_read: true }
        });
    }
}
```

### Step 4 — Service
- **Location:** `server/src/services/NotificationService.ts`
- **Rule:** Contains business logic, validation, and throws specific error messages.
```typescript
// server/src/services/NotificationService.ts
import { INotificationRepository } from '../repositories/NotificationRepository';

export interface INotificationService {
    getUserNotifications(userId: number): Promise<any[]>;
    markNotificationRead(notificationId: number, userId: number): Promise<any>;
}

export class NotificationService implements INotificationService {
    constructor(private readonly notificationRepo: INotificationRepository) {}

    async getUserNotifications(userId: number): Promise<any[]> {
        return this.notificationRepo.findByUserId(userId);
    }

    async markNotificationRead(notificationId: number, userId: number): Promise<any> {
        const result = await this.notificationRepo.markAsRead(notificationId, userId);
        if (result.count === 0) {
            throw new Error('NOTIFICATION_NOT_FOUND_OR_UNAUTHORIZED');
        }
        return { success: true };
    }
}
```

### Step 5 — Controller
- **Location:** `server/src/controllers/NotificationController.ts`
- **Rule:** Handle HTTP req/res, wrap in `try/catch`, shape the response based on errors. Use `req.user?.userId`.
```typescript
// server/src/controllers/NotificationController.ts
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { INotificationService } from '../services/NotificationService';

export class NotificationController {
    constructor(private readonly notificationService: INotificationService) {}

    getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

        try {
            const notifications = await this.notificationService.getUserNotifications(userId);
            res.json(notifications);
        } catch (e: any) {
            console.error('[NotificationController] getNotifications:', e.message);
            res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    };

    markRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const userId = req.user?.userId;
        if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const notificationId = Number(req.params.id);

        try {
            await this.notificationService.markNotificationRead(notificationId, userId);
            res.json({ message: 'Marked as read' });
        } catch (e: any) {
            console.error('[NotificationController] markRead:', e.message);
            if (e.message === 'NOTIFICATION_NOT_FOUND_OR_UNAUTHORIZED') {
                res.status(404).json({ error: 'Notification not found' });
            } else {
                res.status(500).json({ error: 'Failed to mark as read' });
            }
        }
    };
}
```

### Step 6 — Route File
- **Location:** `server/src/routes/notifications.ts`
- **Rule:** Wire dependencies, use `verifyToken`, export the router.
```typescript
// server/src/routes/notifications.ts
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware';
import { NotificationController } from '../controllers/NotificationController';
import { NotificationService } from '../services/NotificationService';
import { NotificationRepository } from '../repositories/NotificationRepository';
import prismaClient from '../prisma';

const router = express.Router();

const repo = new NotificationRepository(prismaClient);
const service = new NotificationService(repo);
const controller = new NotificationController(service);

router.get('/', verifyToken, controller.getNotifications);
router.post('/:id/mark-read', verifyToken, controller.markRead);

export default router;
```

### Step 7 — Register Route in index.ts
- **Location:** `server/src/index.ts`
- Add the import and mount the route:
```typescript
// Add to imports
import notificationRoutes from './routes/notifications';

// Add to Routes section
app.use('/api/notifications', notificationRoutes);
```

---

## 1.3 Adding RBAC to a Specific API Endpoint

### How roles work
- Roles are stored in the `roles` table.
- Users are assigned roles via the `user_roles` join table.
- `authMiddleware.ts` extracts the `roles` array from the JWT payload and attaches it to `req.user.roles`.

### Using the Role Guard
The `checkRole` middleware is defined in `server/src/middleware/authMiddleware.ts`.

#### Single Endpoint
```typescript
import { verifyToken, checkRole } from '../middleware/authMiddleware';

router.post('/admin-action', verifyToken, checkRole(['ADMIN']), controller.adminAction);
```

#### Multiple Allowed Roles
```typescript
router.get('/reports', verifyToken, checkRole(['ADMIN', 'SUPER_ADMIN']), controller.getReports);
```

#### Acting-Role Delegation
For actions where a user is acting on behalf of someone else (e.g., a HOD delegating his role to another instructor), role checks are handled dynamically inside the Controller or Service by verifying active `acting_role_requests`. See `FormController.ts` (`updateFormStatus` method) for the implementation pattern of temporarily elevating/aliasing `userId` and logging the `actingOriginalUserId`.

#### Common Mistakes
- **Do NOT** put role check logic in the Repository layer.
- Keep route-level static RBAC in the Route file using `checkRole`.
- Dynamic resource ownership (e.g., "can I edit THIS form?") belongs in the Service layer.

---

## 1.4 Conventions Quick-Reference Table

| Concern | Convention | File |
|---------|------------|------|
| **File naming per layer** | PascalCase classes (`FormController.ts`), camelCase routes (`forms.ts`) | inferred |
| **Function verb prefixes** | `get`, `create`, `update`, `delete`, `find` | inferred |
| **HTTP status codes** | 200 OK, 201 Created, 400 Bad Req, 401 Unauth, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Error | inferred (`FormController.ts`) |
| **Error throw pattern** | `throw new Error('ERROR_CODE_STRING')` in Service | inferred (`FormService.ts`) |
| **Response envelope** | Direct object `{...}` or `{ error: 'msg' }` | inferred (`FormController.ts`) |
| **Middleware chaining** | `'/path', verifyToken, checkRole([...]), controller.method` | inferred (`forms.ts`) |

---

## 1.5 Design Principles

- **Separation of Concerns:** Controllers handle HTTP. Services handle rules. Repositories handle Prisma.
- **Dependency Injection:** Repositories are injected into Services; Services are injected into Controllers. This is done manually in the route files (e.g., `routes/forms.ts`).
- **Prisma Transactions:** Used when atomic operations are needed (e.g., creating history and comments simultaneously in `FormRepository.ts`).
- **Error Propagation:** Services throw raw errors. Controllers catch them, log the error, and return the appropriate HTTP status code to the client.
