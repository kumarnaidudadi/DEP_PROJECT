# Frontend Extension Guide

## 2.1 Architecture Overview

The frontend is built with Next.js (App Router) and React. The architecture is layered to separate concerns and handle data fetching cleanly:

**Page → Component → Hook → Service → API Instance → Backend**

### Layer Responsibilities
- **Page (`app/dashboard/*/page.tsx`)**: The entry point for a route. Usually simple, acting as a shell to render main views or wrapper components. Protected automatically by the layout wrapper if inside `dashboard/`.
- **Component (`components/dashboard/`)**: UI elements, styling, and structural layout. Components consume custom Hooks to get data. They should not call Services directly.
- **Hook (`hooks/use*.ts`)**: Manages React state (`data`, `loading`, `error`), side-effects (`useEffect`), and provides trigger functions (e.g., `refetch`, `update`). Calls the Service layer.
- **Service (`services/*Service.ts`)**: Pure async functions that call the Axios API instance. Defines TypeScript types for requests and responses. No React state here.
- **API Instance (`lib/api.ts`)**: The configured Axios instance (`axios.create`).

### JWT Interceptor (`lib/api.ts`)
The `api.ts` file configures an Axios interceptor:
```typescript
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```
Every API call made through this instance automatically retrieves the JWT from `localStorage` and attaches it to the `Authorization` header. Another interceptor handles 401/403 responses by clearing the token and redirecting to login.

---

## 2.2 Adding a New Frontend Feature — Step-by-Step

Example: Adding a `/dashboard/notifications` page.

### Step 1 — Type Definitions (`client/types/index.ts`)
- **Location**: `client/types/index.ts`
- **Naming**: PascalCase for interfaces.
```typescript
// client/types/index.ts
export interface Notification {
    id: number;
    user_id: number;
    message: string;
    is_read: boolean;
    created_at: string;
}
```

### Step 2 — Service Function (`client/services/`)
- **Location**: `client/services/notificationService.ts`
- **Rule**: Import `api` from `@/lib/api`.
```typescript
// client/services/notificationService.ts
import api from '@/lib/api';
import { Notification } from '@/types';

export const notificationService = {
    getNotifications: async (): Promise<Notification[]> => {
        const response = await api.get('/notifications');
        return response.data;
    },
    
    markAsRead: async (id: number): Promise<void> => {
        await api.post(`/notifications/${id}/mark-read`);
    }
};
```

### Step 3 — Custom Hook (`client/hooks/`)
- **Location**: `client/hooks/useNotifications.ts`
- **Rule**: Manage loading and error states.
```typescript
// client/hooks/useNotifications.ts
import { useState, useCallback } from 'react';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    const markRead = async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            await fetchNotifications(); // Refresh list
        } catch (err: any) {
            console.error('Failed to mark read', err);
        }
    };

    return { notifications, loading, error, fetchNotifications, markRead };
}
```

### Step 4 — Component (`client/components/dashboard/`)
- **Location**: `client/components/dashboard/NotificationsView.tsx`
- **Rule**: Consume hook, render loading skeletons.
```tsx
// client/components/dashboard/NotificationsView.tsx
import React, { useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsView() {
    const { notifications, loading, error, fetchNotifications, markRead } = useNotifications();

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    if (loading) return <div className="p-4 animate-pulse">Loading notifications...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Notifications</h1>
            <ul className="space-y-2">
                {notifications.map(n => (
                    <li key={n.id} className={`p-4 border rounded ${n.is_read ? 'bg-white' : 'bg-blue-50'}`}>
                        {n.message}
                        {!n.is_read && (
                            <button onClick={() => markRead(n.id)} className="ml-4 text-blue-500">
                                Mark Read
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

### Step 5 — Page File (`client/app/dashboard/notifications/page.tsx`)
- **Location**: `client/app/dashboard/notifications/page.tsx`
- **Rule**: Acts as a route shell. Because it is under `/dashboard/`, it is automatically protected by `app/dashboard/layout.tsx`.
```tsx
// client/app/dashboard/notifications/page.tsx
import React from 'react';
import NotificationsView from '@/components/dashboard/NotificationsView';

export default function NotificationsPage() {
    return <NotificationsView />;
}
```

### Step 6 — Adding to Sidebar Navigation
- **Location**: `client/components/dashboard/Sidebar.tsx`
- **Rule**: Import icon from `lucide-react`, use the `navBtn` helper function.
```tsx
// 1. Import Icon
import { FilePlus, FileText, Bell } from 'lucide-react'; // Added Bell

// 2. Add inside the nav section in Sidebar component
<nav style={{ flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
    {navBtn('/dashboard/all', <FileText size={20} />, 'My Forms', 'My Forms')}
    {/* Add your new nav button here */}
    {navBtn('/dashboard/notifications', <Bell size={20} />, 'Notifications', 'Alerts')}
    // ...
</nav>
```

---

## 2.3 Frontend Conventions Reference

- **File/Component Naming**:
  - Components & Pages: `PascalCase.tsx` (e.g., `ApplicationDetail.tsx`). Note: Next.js App Router expects route files to be literally named `page.tsx`.
  - Hooks: `camelCase.ts` prefixed with `use` (e.g., `useForms.ts`).
  - Services: `camelCase.ts` suffixed with `Service` (e.g., `authService.ts`).
- **Axios Errors**: Handled in hooks via `catch (err: any)`. The standard pattern is to extract the backend error message using `err.response?.data?.error`.
- **Prop Typing**: Defined directly above the component using an interface (e.g., `interface SidebarProps { ... }`).
- **Environment Variables**: To expose a variable to the browser, it **MUST** be prefixed with `NEXT_PUBLIC_` (e.g., `NEXT_PUBLIC_API_URL`). Variables without this prefix are only available on the Node.js server.
