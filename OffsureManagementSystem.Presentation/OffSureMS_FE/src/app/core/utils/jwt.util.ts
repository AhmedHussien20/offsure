/** Decode JWT payload without verifying signature (client-side expiry checks only). */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) {
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Access-token expiry in epoch milliseconds, or null if missing/malformed. */
export function getJwtExpirationMs(token: string): number | null {
  const payload = parseJwtPayload(token);
  const exp = payload?.['exp'];
  return typeof exp === 'number' ? exp * 1000 : null;
}

/** True when token is missing exp, malformed, or past expiry (with skew). */
export function isJwtExpired(token: string, skewMs = 30_000): boolean {
  const expMs = getJwtExpirationMs(token);
  if (expMs == null) {
    return true;
  }
  return Date.now() >= expMs - skewMs;
}
