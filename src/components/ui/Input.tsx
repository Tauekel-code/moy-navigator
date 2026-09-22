import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const baseClasses =
  "w-full h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(baseClasses, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(baseClasses, "h-auto min-h-24 py-2 resize-y", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(baseClasses, "pr-8 appearance-none", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-foreground-muted mb-1 block", className)} {...props} />;
}
