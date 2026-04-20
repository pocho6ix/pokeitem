const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "pokeitem_auth_token";

/**
 * True when the runtime is the Capacitor native shell. Also true in any
 * build where `NEXT_PUBLIC_API_BASE_URL` was set (i.e. the static export
 * build targeting the standalone backend).
 *
 * On plain web (Vercel / `next dev`) this is always `false`, and `fetchApi`
 * degrades to a pass-through `fetch()` so we don't change any request
 * semantics that might affect the existing PWA.
 */
function isExternalApiMode(): boolean {
  if (API_BASE_URL) return true;
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Boolean((window as any).Capacitor);
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  if (!API_BASE_URL) return path;
  return API_BASE_URL.replace(/\/$/, "") + path;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * `fetchApi` behaves like `fetch` but rewrites `/api/…` paths to the
 * external API base URL on Capacitor/mobile, and forwards the Bearer
 * token from localStorage. On plain web it's a pass-through — same
 * URL, same cookie-based credentials — so existing PWA behavior is
 * unchanged.
 */
export async function fetchApi(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  // Web / same-origin: identical to native fetch() — do NOT mutate
  // headers, credentials, or the URL. This keeps the NextAuth cookie
  // flow and every /api/* contract unchanged on Vercel.
  if (!isExternalApiMode()) {
    return fetch(path, options);
  }

  const url = path.startsWith("http") ? path : apiUrl(path);
  const headers = new Headers(options.headers);

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? "include",
  });
}
