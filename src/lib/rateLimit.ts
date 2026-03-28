/**
 * Simple in-memory rate limiter (IP-based)
 * Limits requests per IP per time window
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
    ip: string,
    limit: number = 100,
    windowMs: number = 60_000
): { ok: boolean; remaining: number } {
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now > entry.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1 };
    }

    entry.count++;
    if (entry.count > limit) {
        return { ok: false, remaining: 0 };
    }

    return { ok: true, remaining: limit - entry.count };
}

/**
 * Middleware helper for API routes
 */
export function checkRateLimit(
    request: Request,
    limit?: number
): Response | null {
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";

    const result = rateLimit(ip, limit);
    if (!result.ok) {
        return new Response(
            JSON.stringify({ error: "Too many requests. Please try again later." }),
            {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "Retry-After": "60",
                },
            }
        );
    }
    return null;
}

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits.entries()) {
        if (now > val.resetAt) hits.delete(key);
    }
}, 60_000);
