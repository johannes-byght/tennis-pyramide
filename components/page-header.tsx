import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, right, className }: Props) {
  return (
    <header className={cn("px-5 pt-6 pb-3 flex items-end justify-between gap-3", className)}>
      <div>
        <h1 className="font-display text-3xl tracking-tight leading-none">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
