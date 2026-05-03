import { cn } from "@/lib/utils";
import { avatarUrl } from "@/lib/utils";

type Props = {
  seed: string;
  size?: number;
  className?: string;
  ring?: boolean;
};

export function Avatar({ seed, size = 40, className, ring = false }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-court-100 dark:bg-court-800/50 overflow-hidden",
        ring && "ring-2 ring-lemon-400",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl(seed)} alt="" width={size} height={size} className="object-cover" />
    </span>
  );
}
