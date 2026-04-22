// ─── ipHelper.ts ──────────────────────────────────────────────────────────────
// Safely extract the real client IP from an Express request.
// Respects: x-forwarded-for (proxies/Cloudflare), x-real-ip (NGINX), socket.

import { Request } from 'express';

/**
 * Extract the best-available client IP from an Express request.
 * Returns null if the IP cannot be determined.
 *
 * Priority:
 *  1. x-forwarded-for header  (first IP in the list — the original client)
 *  2. x-real-ip header        (set by NGINX reverse proxy)
 *  3. req.socket.remoteAddress (direct TCP connection, e.g. local dev)
 */
export function extractIp(req: Request): string | null {
    // x-forwarded-for may contain a comma-separated list: "client, proxy1, proxy2"
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
            .split(',')[0]
            .trim();
        if (first) return first;
    }

    // x-real-ip (single value)
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Direct socket (local dev → "::1" or "127.0.0.1")
    return (req.socket?.remoteAddress) ?? null;
}
