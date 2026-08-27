/** Typed fetch wrapper for the backend API (same-origin via Next rewrites). */

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Auth uses an httpOnly cookie set by the backend (safe from XSS).
 * `credentials: 'include'` sends it automatically — also works cross-origin
 * when NEXT_PUBLIC_API_URL points at a separate API host.
 */

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  // Same-origin via the Next proxy by default; set NEXT_PUBLIC_API_URL when the
  // API is hosted separately (e.g. frontend on Vercel, API on Render).
  const base = process.env.NEXT_PUBLIC_API_URL || '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch(`${base}/api${path}`, {
      method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}
