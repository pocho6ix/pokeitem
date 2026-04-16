"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastOptions {
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const toastVariants = cva(
  "pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all",
  {
    variants: {
      variant: {
        success:
          "bg-green-600 text-white dark:bg-green-700",
        error:
          "bg-red-600 text-white dark:bg-red-700",
        info:
          "bg-blue-600 text-white dark:bg-blue-700",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const icons: Record<ToastVariant, ReactNode> = {
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const toast = useCallback((message: string, variant: ToastVariant = "info", options?: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, variant, action: options?.action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(toastVariants({ variant: t.variant }))}
              >
                {icons[t.variant]}
                <span className="flex-1">{t.message}</span>
                {t.action && (
                  <button
                    onClick={() => { t.action!.onClick(); dismiss(t.id); }}
                    className="text-white underline text-xs font-semibold ml-2 hover:opacity-80 transition-opacity"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  onClick={() => dismiss(t.id)}
                  className="ml-2 rounded p-0.5 hover:bg-white/20 transition-colors"
                  aria-label="Dismiss"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export { ToastProvider };
