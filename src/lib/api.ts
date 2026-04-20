const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TOKEN_STORAGE_KEY = "pokeitem_auth_token";

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

export async function fetchApi(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http") ? path : apiUrl(path);
  const headers = new Headers(options.headers);

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const shouldSendCookies = !API_BASE_URL;
  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials ?? (shouldSendCookies ? "same-origin" : "include"),
  });
}
