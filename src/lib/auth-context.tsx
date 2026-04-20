"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SessionProvider,
  useSession as nextAuthUseSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import { apiUrl, fetchApi, getAuthToken, setAuthToken } from "@/lib/api";

// ─── Environment detection ───────────────────────────────────
// Capacitor injects `window.Capacitor` synchronously before the app bundle
// runs, so checking at module load is stable across all renders. We keep
// the value in a constant so hooks always take the same branch — this
// satisfies React's rules-of-hooks even though there is a conditional.
const IS_CAPACITOR =
  typeof window !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Boolean((window as any).Capacitor);

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  plan?: "FREE" | "PRO";
  hasAvatar?: boolean;
  image?: string | null;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  update: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Mobile provider (Bearer token → /api/auth/login) ────────
function MobileAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const loadMe = useCallback(async (signal?: AbortSignal) => {
    const res = await fetchApi("/api/auth/me", { signal });
    if (!res.ok) throw new Error(`auth/me failed: ${res.status}`);
    const data = await res.json();
    return data.user as AuthUser;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const storedToken = getAuthToken();
    setToken(storedToken);

    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }

    loadMe(controller.signal)
      .then((u) => {
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => controller.abort();
  }, [loadMe]);

  const login = useCallback<AuthContextValue["login"]>(async (email, password) => {
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || "Login failed" };
      }
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
      setStatus("authenticated");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await loadMe();
      setUser(u);
      setStatus("authenticated");
    } catch {
      await logout();
    }
  }, [loadMe, logout]);

  const update = useCallback<AuthContextValue["update"]>((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      isLoading: status === "loading",
      login,
      logout,
      refresh,
      update,
    }),
    [user, token, status, login, logout, refresh, update],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Web provider: just re-export NextAuth's SessionProvider ──
// The AuthContext is left unset in web mode — `useAuth()` falls back
// to NextAuth session data. This keeps existing NextAuth flows intact.
function WebAuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// ─── Unified public provider ─────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  return IS_CAPACITOR ? (
    <MobileAuthProvider>{children}</MobileAuthProvider>
  ) : (
    <WebAuthProvider>{children}</WebAuthProvider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────
/**
 * Unified auth hook. Returns the same shape in both modes so callers
 * don't need to know where the session came from.
 */
export function useAuth(): AuthContextValue {
  if (IS_CAPACITOR) {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
  }

  // Web path: translate NextAuth session → our shape
  const nextAuth = nextAuthUseSession();
  const sessionUser = nextAuth.data?.user as (AuthUser & { id: string }) | undefined;
  const status: AuthStatus =
    nextAuth.status === "loading"
      ? "loading"
      : nextAuth.status === "authenticated"
      ? "authenticated"
      : "unauthenticated";

  // Stable no-op callbacks for API parity. Web mutations go through the
  // normal NextAuth flow (cookie-based), so login/logout here delegate
  // to NextAuth's signIn/signOut helpers.
  return {
    user: sessionUser ?? null,
    token: null,
    status,
    isLoading: status === "loading",
    login: async (email, password) => {
      const result = await nextAuthSignIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) return { ok: false, error: result.error };
      return { ok: true };
    },
    logout: async () => {
      await nextAuthSignOut({ redirect: false });
    },
    refresh: async () => {
      await nextAuth.update?.();
    },
    update: () => {
      // Web session updates happen through NextAuth's update() — ignore
      // local patches here; callers should call `update()` on the next-auth
      // session instead.
    },
  };
}

/**
 * Compatibility shim that mimics next-auth's `useSession` shape so existing
 * callers can migrate mechanically. On web it forwards to the real
 * `useSession`; on Capacitor it reads from our AuthContext.
 */
export function useSession() {
  if (IS_CAPACITOR) {
    const ctx = useContext(AuthContext);
    const user = ctx?.user ?? null;
    const status = ctx?.status ?? "loading";
    return {
      data: user
        ? {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              username: user.username,
              image: user.image ?? null,
              hasAvatar: user.hasAvatar ?? false,
              plan: user.plan,
            },
          }
        : null,
      status,
      update: async (patch?: Partial<AuthUser> | null) => {
        if (patch) ctx?.update(patch);
        else await ctx?.refresh();
        return null;
      },
    };
  }
  // Web: defer to NextAuth directly — preserves existing behaviour.
  return nextAuthUseSession();
}

type SignInCredentials = {
  email?: string;
  password?: string;
  redirect?: boolean;
  callbackUrl?: string;
  autoLoginToken?: string;
};

type SignInResult = {
  ok: boolean;
  error?: string;
  url?: string | null;
  status?: number;
};

/**
 * `signIn` dispatches to NextAuth on web (full OAuth support preserved)
 * and to our Bearer-token login on Capacitor (credentials only).
 */
export async function signIn(
  provider: string,
  credentials: SignInCredentials = {},
): Promise<SignInResult> {
  if (!IS_CAPACITOR) {
    // Preserve the exact NextAuth behavior on the web.
    const res = await nextAuthSignIn(provider, credentials);
    return (res as SignInResult | undefined) ?? { ok: false };
  }

  if (provider !== "credentials") {
    return {
      ok: false,
      error: "OAuth providers are not supported in the mobile build",
    };
  }

  const { email, password, callbackUrl } = credentials;
  if (!email || !password) {
    return { ok: false, error: "Missing credentials" };
  }

  try {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || "Login failed",
        status: res.status,
      };
    }
    setAuthToken(data.token);
    return { ok: true, url: callbackUrl ?? null };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * `signOut` clears the mobile token on Capacitor, or defers to NextAuth
 * on web (which hits the /api/auth/signout cookie-clearing endpoint).
 */
export async function signOut(
  options: { callbackUrl?: string; redirect?: boolean } = {},
): Promise<void> {
  if (!IS_CAPACITOR) {
    await nextAuthSignOut(options);
    return;
  }
  setAuthToken(null);
  if (options.redirect !== false && typeof window !== "undefined") {
    window.location.href = options.callbackUrl ?? "/";
  }
}
