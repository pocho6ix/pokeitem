"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme";
import { WishlistHydrator } from "@/components/wishlist/WishlistHydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <WishlistHydrator />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
