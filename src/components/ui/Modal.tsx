"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, size = "md" }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div
        className={cn(
          "w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto",
          sizeClasses[size],
        )}
      >
        {title && (
          <div className="sticky top-0 bg-surface flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-muted" aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
