"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingBag, FileText, ScanLine, Menu, User, LogOut, BookOpen } from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { CommandSearch } from "@/components/shared/CommandSearch";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; authRequired?: boolean }[] = [
  { href: "/collection", label: "Collection", icon: Package },
  { href: "/market", label: "Market", icon: ShoppingBag },
  { href: "/scanner", label: "Scanner", icon: ScanLine },
  { href: "/portfolio", label: "Classeur", icon: BookOpen, authRequired: true },
  { href: "/blog", label: "Blog", icon: FileText },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-200 bg-white dark:bg-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
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
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-50 dark:text-blue-600"
                      : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <CommandSearch />
            <ThemeToggle />

            {session ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/profil"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-sm font-medium"
                  title={session.user?.name ?? "Profil"}
                >
                  {session.user?.name?.charAt(0).toUpperCase() ?? "U"}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-100"
                  title="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link href="/connexion" className="hidden md:block">
                <Button size="sm">Connexion</Button>
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-100 md:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sheet */}
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
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-50 dark:text-blue-600"
                    : "text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
          <hr className="my-3 border-[var(--border-default)]" />
          {session ? (
            <button
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </button>
          ) : (
            <Link
              href="/connexion"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-100"
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
