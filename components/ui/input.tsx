import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-pill bg-card border border-border px-5 text-base text-fg placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-court-300 focus:border-court-300 transition",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-24 w-full rounded-card bg-card border border-border p-4 text-base text-fg placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-court-300 focus:border-court-300 transition",
          className,
        )}
        {...props}
      />
    );
  },
);
