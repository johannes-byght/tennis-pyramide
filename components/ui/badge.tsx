import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "court" | "sand" | "lemon" | "muted";

const variants: Record<Variant, string> = {
  court: "bg-court-100 text-court-800 dark:bg-court-800/40 dark:text-court-100",
  sand: "bg-sand-100 text-sand-800 dark:bg-sand-800/30 dark:text-sand-100",
  lemon: "bg-lemon-300 text-court-900",
  muted: "bg-border text-muted",
};

export function Badge({
  variant = "court",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
