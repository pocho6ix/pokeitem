"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ScanLine, BookOpen, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

const MOBILE_NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/collection", label: "Collection", icon: Package },
  { href: "/scanner", label: "Scanner", icon: ScanLine },
  { href: "/portfolio", label: "Classeur", icon: BookOpen },
  { href: "/echanges", label: "Échanges", icon: ArrowLeftRight },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isPro } = useSubscription();

  return (
    /* Outer shell — leaves room for the iPhone home indicator */
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 md:hidden"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {/* Floating pill */}
      <div className="flex items-center justify-around rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)]/90 backdrop-blur-xl shadow-2xl shadow-black/50 py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const isLocked = item.href === "/echanges" && !isPro;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-2 py-0.5 transition-colors",
                isActive
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--text-tertiary)]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] leading-tight">{item.label}</span>
              {isLocked && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#E7BA76] text-[7px] font-bold text-black">★</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
