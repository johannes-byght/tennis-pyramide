import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-pill transition-transform select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-court-600 text-white hover:bg-court-700 shadow-cozy",
        secondary: "bg-card text-fg border border-border hover:bg-sand-50 dark:hover:bg-court-800/40",
        ghost: "text-fg hover:bg-sand-100 dark:hover:bg-court-800/40",
        accent: "bg-lemon-400 text-court-900 hover:bg-lemon-500 shadow-cozy",
        danger: "bg-clay text-white hover:bg-clay-dark",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-14 px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
});
