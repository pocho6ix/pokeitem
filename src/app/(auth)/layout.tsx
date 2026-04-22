import type { Metadata } from "next";

// All `(auth)` routes are transactional flows (login, signup, password
// reset, email verification) — no SEO value, and we want them kept out
// of the crawl graph entirely. Centralizing `robots` here covers the
// three client-side pages (mot-de-passe-oublie, verification,
// reinitialiser-mot-de-passe) which cannot export metadata themselves.
// Pages can still override title/description individually.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
