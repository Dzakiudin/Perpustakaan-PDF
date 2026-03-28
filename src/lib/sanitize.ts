/**
 * Input sanitization utilities for XSS prevention
 */

/**
 * Strip dangerous HTML tags and attributes
 */
export function sanitizeHtml(input: string): string {
    if (!input) return "";
    return input
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        // Remove event handlers
        .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, "")
        // Remove javascript: URLs
        .replace(/javascript\s*:/gi, "")
        // Remove data: URLs (except images)
        .replace(/data\s*:(?!image\/)/gi, "")
        // Remove iframe, object, embed
        .replace(/<(iframe|object|embed|form|input)\b[^>]*>/gi, "")
        // Remove style with expressions
        .replace(/expression\s*\(/gi, "")
        // Remove vbscript
        .replace(/vbscript\s*:/gi, "");
}

/**
 * Strip ALL HTML tags (plain text only)
 */
export function stripTags(input: string): string {
    if (!input) return "";
    return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize user text input: trim, limit length, strip dangerous content
 */
export function sanitizeText(input: string, maxLength: number = 10000): string {
    if (!input) return "";
    return stripTags(input.replace(/\0/g, "")).slice(0, maxLength).trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: string): string {
    return input?.trim().toLowerCase().slice(0, 254) || "";
}

/**
 * Validate that a string is a safe filename
 */
export function isSafeFilename(name: string): boolean {
    const dangerousPatterns = [
        /\.\./,       // path traversal
        /[<>:"/\\|?*]/,  // dangerous chars including slashes
        /^~/,         // home dir
        /\.(exe|bat|cmd|sh|js|html|php|py|pl|cgi)$/i, // block executable/script extensions
    ];
    return !dangerousPatterns.some(p => p.test(name)) && !name.includes(String.fromCharCode(0));
}
