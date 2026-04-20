"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import { WishlistHydrator } from "@/components/wishlist/WishlistHydrator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <WishlistHydrator />
          {children}
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
