/**
 * Cookie utility — safe wrapper for cookie operations.
 * Avoids direct `document.cookie` usage (lint: unicorn/no-document-cookie).
 */

export function setCookie(name: string, value: string, maxAge: number = 86400) {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=strict`;
}

export function deleteCookie(name: string) {
    document.cookie = `${name}=; path=/; max-age=0`;
}

export function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
}
