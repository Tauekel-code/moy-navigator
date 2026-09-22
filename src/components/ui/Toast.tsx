"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  variant: "default" | "success" | "error";
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast должен использоваться внутри ToastProvider");
  return ctx;
}

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastItem["variant"] = "default") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto rounded-full px-4 py-2 text-sm shadow-lg border ${
              t.variant === "success"
                ? "bg-green-600 text-white border-green-700"
                : t.variant === "error"
                  ? "bg-red-600 text-white border-red-700"
                  : "bg-surface text-foreground border-border"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
