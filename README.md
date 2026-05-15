# 🏛️ LTMS — Leave & Travel Management System

> **IIT Ropar** · Digital Document Workflow Platform  
> A unified, institution-grade system for submitting, routing, approving, and auditing administrative forms — eliminating paper trails and fragmented email workflows.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

LTMS is a full-stack institutional form management system built for IIT Ropar. It replaces physical paper-based approval workflows with a transparent, role-aware digital pipeline. Every form submission — from Station Leave Permissions to Joining Reports — follows a configurable multi-level approval chain with full audit logging, real-time status tracking, and auto-generated PDF documents.

**Core Problems Solved:**
- Eliminate lost paper forms and untraceable approvals
- Provide a single source of truth for all application statuses
- Enable real-time notifications at every workflow step
- Generate tamper-evident PDF records with approval timelines

---

## Features

### 🔐 Authentication
- **OTP-based email login** (Gmail SMTP via Nodemailer)
- **Google OAuth 2.0** login integration
- **JWT-based session management** (1-day expiry)
- Account activation/deactivation with reactivation request flow

### 📝 Dynamic Form Builder
- Admin-configurable JSON schema forms (no code changes needed)
- Field types: text, number, date, select, textarea, date-range
- Conditional field visibility rules
- Auto-generated unique reference numbers per form type (e.g., `STLP2026000028`)

### 🔄 Multi-Level Approval Workflow
- Manual forwarding: approver selects the next person in chain
- Role-based visibility: each approver only sees forms at their level
- Actions: **Submit → Forward → Partially Approve → Approve / Reject**
- Acting-role delegation: approve on behalf of another user

### 📄 PDF Generation
- Auto-generated government-style letterhead PDFs using `pdf-lib`
- IIT Ropar letterhead with institution logo
- Full form data, approval timeline, and audit signature
- **"Submitted & Forwarded"**, **"Partially Approved"**, **"Approved"** step logic in timeline
- Application number (APPL NO) in footer

### 💬 Pairwise Comment System
- Comments visible only to the sender and receiver
- Threaded replies
- Linked to specific approval history events
- TipTap rich-text editor for comment content

### 📊 Admin Statistics Dashboard
- Platform-wide metrics: total submitted, approved, rejected, forwarded
- Activity Volume by Day bar chart with **drill-down to hourly view**
- Day bar click → load hourly breakdown from `/statistics/general/hourly?date=`
- "View in System Logs →" button from the hourly chart
- IP address analytics with security warning for multi-user IPs
- User-specific action timelines

### 🗂️ System Logs
- Full audit trail of every form action (submit, forward, approve, reject)
- Filterable by action type, user, date range, form type
- Deep-linked from Statistics dashboard (e.g., `?action=approved`, `?date=2026-04-22`)
- IP address per action for accountability

### 👤 User Management (Admin)
- Create, activate, deactivate users
- Assign roles: `APPLICANT`, `APPROVER`, `ADMIN`
- Bulk user import via Excel (`xlsx`)
- Reactivation request review workflow

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (App Router) | React framework, SSR, routing |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Axios** | HTTP client |
| **TipTap** | Rich-text comment editor |
| **Lucide React** | Icon system |
| **Tailwind CSS v4** | Utility styling |
| **@react-oauth/google** | Google OAuth popup |

### Backend
| Technology | Purpose |
|---|---|
| **Express.js v5** | HTTP server |
| **TypeScript** | Type safety |
| **Prisma ORM v7** | Database access layer |
| **PostgreSQL** | Relational database (Supabase hosted) |
| **pdf-lib** | Server-side PDF generation |
| **Nodemailer** | OTP email delivery (Gmail SMTP) |
| **jsonwebtoken** | JWT auth tokens |
| **bcryptjs** | Password hashing |
| **google-auth-library** | Google OAuth token verification |
| **multer** | File upload (signature images) |
| **xlsx** | Excel bulk user import |

### Infrastructure
| Service | Purpose |
|---|---|
| **Supabase (PostgreSQL)** | Managed database with connection pooling |
| **Render** | Backend + Frontend deployment |
| **Google Cloud Console** | OAuth 2.0 credentials |

---

## Project Structure

```
DEP_PROJECT/
├── client/                          # Next.js frontend
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── all/                 # All applications view
│   │   │   ├── pending/             # Pending approvals (approver view)
│   │   │   ├── acting-pending/      # Acting-role pending queue
│   │   │   ├── new/                 # Form type selector
│   │   │   ├── create/[typeId]/     # Dynamic form fill
│   │   │   ├── profile/             # User profile & signature upload
│   │   │   ├── user-management/     # Admin user CRUD
│   │   │   ├── system-logs/         # Audit log table
│   │   │   ├── statistics/          # Analytics dashboard
│   │   │   └── layout.tsx           # Dashboard shell (Sidebar + auth guard)
│   │   └── login/                   # OTP + Google login page
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx          # Icon sidebar with tooltips
│   │   │   ├── ActivitySidebar.tsx  # Right panel: timeline & comments
│   │   │   ├── views/
│   │   │   │   └── ApplicationDetail.tsx  # Form viewer + action panel
│   │   │   └── StatusBadge.tsx
│   │   └── ui/
│   │       ├── FieldRenderer.tsx    # Dynamic form field renderer
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useAuth.ts               # JWT decode + role management
│   │   ├── useForms.ts              # Form CRUD hook
│   │   └── useProfile.ts
│   ├── services/
│   │   └── authService.ts           # sendOtp, verifyOtp, googleLogin
│   ├── lib/
│   │   └── api.ts                   # Axios instance with JWT interceptor
│   └── types/
│       └── index.ts                 # Shared TypeScript interfaces
│
└── server/                          # Express.js backend
    ├── src/
    │   ├── index.ts                 # App entry, CORS, middleware, routes
    │   ├── controllers/
    │   │   ├── AuthController.ts
    │   │   ├── FormController.ts
    │   │   ├── UserAdminController.ts
    │   │   └── StatisticsController.ts
    │   ├── services/
    │   │   ├── AuthService.ts       # OTP, Google OAuth, JWT, bcrypt
    │   │   ├── FormService.ts       # Forwarding, approval, status logic
    │   │   ├── PdfDocumentBuilder.ts# pdf-lib letterhead + timeline PDF
    │   │   ├── EmailService.ts      # Nodemailer SMTP wrappers
    │   │   ├── StatisticsService.ts # Aggregation queries for dashboard
    │   │   ├── UserService.ts       # CRUD, bulk import, role assign
    │   │   ├── OtpService.ts        # OTP generation & verification
    │   │   └── ActingRoleService.ts # Acting delegation logic
    │   ├── routes/
    │   │   ├── auth.ts              # POST /api/auth/*
    │   │   ├── forms.ts             # /api/forms/*
    │   │   ├── user-admin.ts        # /api/user-admin/*
    │   │   ├── statistics.ts        # /api/statistics/*
    │   │   └── formComments.routes.ts
    │   ├── repositories/
    │   │   ├── FormRepository.ts    # Prisma queries for forms
    │   │   └── UserRepository.ts    # Prisma queries for users
    │   ├── middleware/
    │   │   └── authMiddleware.ts    # JWT verify + req.user injection
    │   └── dtos/
    │       ├── FormDto.ts
    │       └── AuthDto.ts
    └── prisma/
        ├── schema.prisma            # Full DB schema (15+ models)
        └── seed.ts                  # Default roles + admin user seed
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|---|---|
| `users` | User accounts (email, OTP, auth_provider, signature_url, dept) |
| `roles` | Role definitions with hierarchy_level |
| `user_roles` | Many-to-many user ↔ role mapping |
| `departments` | Organizational department registry |
| `form_types` | Form templates (JSON schema, approval_rules, ref_prefix) |
| `applied_forms` | Submitted form instances with JSON form_data |
| `form_forwards` | Forwarding chain (from → to, timestamp, note) |
| `form_history` | Full audit log (action, IP, acting_on_behalf_of) |
| `form_comments` | Pairwise threaded comments (sender, receiver, parent) |
| `form_approvals` | Decision records per approval level |
| `office_orders` | Generated PDF document references |
| `reactivation_requests` | Inactive user reactivation workflow |
| `acting_role_requests` | Delegation of approval authority |
| `user_activity_logs` | Login/activity audit |
| `workflows` | Abstract workflow definitions linked to form_types |

### Key Relationships
```
users ─┬──< applied_forms (applicant_id)
       ├──< form_forwards (forwarded_by / forwarded_to)
       ├──< form_history (changed_by / acting_on_behalf_of)
       └──< form_comments (commented_by / receiver_id)

applied_forms ─┬──< form_forwards
               ├──< form_history
               └──< form_comments

form_types ──< applied_forms
           ──< workflows
```

---

## API Endpoints

### Auth  `POST /api/auth/*`
| Endpoint | Description |
|---|---|
| `POST /send-otp` | Send OTP to email |
| `POST /verify-otp` | Verify OTP, return JWT |
| `POST /google` | Google OAuth token → JWT |

### Forms  `/api/forms/*`
| Endpoint | Description |
|---|---|
| `GET /types` | List all form types |
| `POST /types` | Create form type (Admin) |
| `PUT /types/:id` | Update form type (Admin) |
| `GET /` | List applied forms (role-filtered) |
| `POST /` | Submit new application |
| `GET /:id` | Get single application |
| `POST /:id/forward` | Forward to next approver |
| `POST /:id/approve` | Approve / Reject |
| `GET /:id/pdf` | Download generated PDF |
| `GET /system/logs` | Admin system-wide audit log |
| `GET /:id/history` | Application audit timeline |
| `GET /pending` | Approver's pending queue |

### Statistics  `/api/statistics/*`
| Endpoint | Description |
|---|---|
| `GET /general` | Platform-wide metrics + daily breakdown |
| `GET /general/hourly?date=` | Hourly activity for a specific date |
| `GET /user/:userId` | Per-user stats + timeline |
| `GET /ip?ipAddress=` | IP address activity analysis |
| `GET /users` | User list for filter dropdown |

### User Admin  `/api/user-admin/*`
| Endpoint | Description |
|---|---|
| `GET /` | List all users |
| `POST /` | Create user |
| `PUT /:id/toggle-active` | Activate / Deactivate |
| `POST /bulk-upload` | Excel bulk import |
| `GET /roles` | List all roles |

---

## Getting Started

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** database (or a Supabase project)
- **Gmail App Password** for SMTP (OTP delivery)
- **Google Cloud Console** OAuth 2.0 Client ID

### 1. Clone & Install

```bash
git clone <repo-url>
cd DEP_PROJECT

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables

```bash
# server/.env
cp server/.env.example server/.env
# Edit server/.env (see Environment Variables section)

# client/.env
cp client/.env.example client/.env
# Edit client/.env
```

### 3. Run Database Migrations & Seed

```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

---

## Environment Variables

### `server/.env`

```env
# Database
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"

# Server
PORT=4000
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-jwt-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Email OTP (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### `client/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

> ⚠️ **Important for Deployment:** On Render (or any hosting), set `FRONTEND_URL` on the server to your deployed frontend URL to prevent CORS failures on OTP login.

---

## Deployment

### Render (Recommended)

**Backend service:**
- Build command: `cd server && npm install && npm run build`
- Start command: `node server/dist/index.js`
- Environment: add all `server/.env` variables

**Frontend service:**
- Framework: Next.js
- Build command: `cd client && npm install && npm run build`
- Environment: add all `client/.env` variables with production URLs

### Key Production Checklist
- [ ] Set `FRONTEND_URL` to deployed frontend domain (fixes CORS/OTP issue)
- [ ] Set `NEXT_PUBLIC_API_URL` to deployed backend domain
- [ ] Run `npx prisma migrate deploy` against production DB
- [ ] Set `NODE_TLS_REJECT_UNAUTHORIZED=0` if using Supabase with SSL issues

---

## Contributing
- works on macOS , Windows , linux 
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](./LICENSE)

---

*Built with ❤️ for IIT Ropar — DEP Project 2026*
