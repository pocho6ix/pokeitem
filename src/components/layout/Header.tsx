"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingBag, FileText, ScanLine, BookOpen, User, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getDefaultAvatar } from "@/lib/defaultAvatar";
import { Logo } from "@/components/shared/Logo";
import { CommandSearch } from "@/components/shared/CommandSearch";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; authRequired?: boolean }[] = [
  { href: "/collection", label: "Collection", icon: Package },
  { href: "/market", label: "Market", icon: ShoppingBag },
  { href: "/scanner", label: "Scanner", icon: ScanLine },
  { href: "/portfolio", label: "Classeur", icon: BookOpen, authRequired: true },
  { href: "/blog", label: "Blog", icon: FileText },
];

// ─── Greeting helper ──────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return "Bonsoir";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
}

// ─── Avatar src helper ────────────────────────────────────────────────────────
// Derives the avatar URL from session — never from the JWT cookie image field.
// hasAvatar is a boolean stored in JWT; actual image served via /api/avatar/[id].

function getAvatarSrc(
  userId: string | null | undefined,
  hasAvatar: boolean | undefined,
): string | null {
  if (!userId) return null;
  if (hasAvatar) return `/api/avatar/${userId}`;
  return getDefaultAvatar(userId);
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────

function MobileTopBar({ isTransparent }: { isTransparent: boolean }) {
  const { data: session } = useSession();
  const pseudo     = session?.user?.name ?? null;
  const userId     = (session?.user as { id?: string } | undefined)?.id ?? null;
  const hasAvatar  = (session?.user as { hasAvatar?: boolean } | undefined)?.hasAvatar;
  const avatarSrc  = session ? getAvatarSrc(userId, hasAvatar) : null;

  return (
    <div className="flex h-14 items-center justify-between px-4 md:hidden">
      {/* Left: logo icon + greeting */}
      <div className="flex items-center gap-3">
        <Logo variant="icon" size="md" />
        <div className="leading-tight">
          {pseudo ? (
            <>
              <p className={cn("text-[11px]", isTransparent ? "text-white/60" : "text-[var(--text-tertiary)]")}>{getGreeting()},</p>
              <p className={cn("text-sm font-bold", isTransparent ? "text-white" : "text-[var(--text-primary)]")}>{pseudo}</p>
            </>
          ) : (
            <p className={cn("text-sm font-bold", isTransparent ? "text-white" : "text-[var(--text-primary)]")}>PokeItem</p>
          )}
        </div>
      </div>

      {/* Right: profile icon */}
      <div className="flex items-center gap-2">
        {session ? (
          <Link href="/profil" title="Mon profil" className="block h-9 w-9 shrink-0">
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={pseudo ?? "Profil"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
                {pseudo?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
              </span>
            )}
          </Link>
        ) : (
          <Link
            href="/connexion"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
              isTransparent
                ? "border-white/30 bg-white/10 text-white"
                : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
            )}
            title="Connexion"
          >
            <User className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const userId    = (session?.user as { id?: string } | undefined)?.id ?? null;
  const hasAvatar = (session?.user as { hasAvatar?: boolean } | undefined)?.hasAvatar;
  const avatarSrc = session ? getAvatarSrc(userId, hasAvatar) : null;

  // Track scroll to toggle header transparency on the homepage
  useEffect(() => {
    if (pathname !== "/") return;
    setScrolled(window.scrollY > 80);
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Transparent only on homepage before the user scrolls past the hero
  const isTransparent = pathname === "/" && !scrolled;

  return (
    <>
      {/* ── Unified header shell ── */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          isTransparent
            ? "border-b border-transparent bg-transparent"
            : "border-b border-[var(--border-default)] bg-[var(--bg-primary)]/80 backdrop-blur-xl"
        )}
      >

        {/* Mobile top bar */}
        <MobileTopBar isTransparent={isTransparent} />

        {/* Desktop nav bar */}
        <div className="mx-auto hidden h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 md:flex">

          {/* Logo */}
          <Logo />

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.authRequired && !session) return null;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <CommandSearch />

            {session ? (
              <div className="flex items-center gap-2">
                <Link href="/profil" title={session.user?.name ?? "Profil"} className="block h-8 w-8 shrink-0">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={session.user?.name ?? "Profil"}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-blue-600/50"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {session.user?.name?.charAt(0).toUpperCase() ?? <User className="h-4 w-4" />}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                  title="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/connexion">
                <Button size="sm">Connexion</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      <Sheet isOpen={mobileOpen} onClose={() => setMobileOpen(false)} title="Menu">
        <nav className="flex flex-col gap-1 pt-4">
          {NAV_ITEMS.map((item) => {
            if (item.authRequired && !session) return null;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <hr className="my-3 border-[var(--border-default)]" />
          {session ? (
            <>
              <Link
                href="/profil"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              >
                <User className="h-5 w-5" />
                Mon profil
              </Link>
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/" }); }}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </>
          ) : (
            <Link
              href="/connexion"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            >
              <User className="h-5 w-5" />
              Connexion
            </Link>
          )}
        </nav>
      </Sheet>
    </>
  );
}
