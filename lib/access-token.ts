/**
 * Access token utilities for client-side payment gating.
 *
 * Token format: HMAC-SHA256(timestamp, secret) + "." + timestamp
 * Validity: 1 hour from creation.
 *
 * The server generates tokens using a secret derived from DODO_PAYMENTS_API_KEY.
 * The client stores and presents tokens; the server validates them.
 */

const ACCESS_TOKEN_STORAGE_KEY = "pro_access_token_v1";
const ACCESS_TOKEN_VALIDITY_MS = 60 * 60 * 1000; // 1 hour

/** Save a token received from the checkout success flow */
export function saveAccessToken(token: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

/** Retrieve the stored token, or null */
export function getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

/** Clear the stored token */
export function clearAccessToken(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

/**
 * Parse a token and check if it's still within the validity window.
 * Token format: <signature>.<timestamp>
 * We only check the timestamp on the client; the signature is verified server-side.
 */
export function isAccessTokenValid(): boolean {
    const token = getAccessToken();
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 2) {
        clearAccessToken();
        return false;
    }

    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp)) {
        clearAccessToken();
        return false;
    }

    const now = Date.now();
    if (now - timestamp > ACCESS_TOKEN_VALIDITY_MS) {
        clearAccessToken();
        return false;
    }

    return true;
}
