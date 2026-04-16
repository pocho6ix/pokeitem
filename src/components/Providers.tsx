"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { WishlistHydrator } from "@/components/wishlist/WishlistHydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ToastProvider>
          <WishlistHydrator />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
