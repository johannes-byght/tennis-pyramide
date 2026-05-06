import { cn } from "@/lib/utils";
import { avatarUrl } from "@/lib/utils";

type Props = {
  seed: string;
  size?: number;
  className?: string;
  ring?: boolean;
  initials?: string | null;
};

export function Avatar({ seed, size = 40, className, ring = false, initials }: Props) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full bg-court-100 dark:bg-court-800/50 overflow-hidden",
        ring && "ring-2 ring-lemon-400",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={avatarUrl(seed)} alt="" width={size} height={size} className="object-cover" />
      {initials && (
        <span
          className="absolute inset-0 flex items-end justify-center pb-[6%] text-white font-bold leading-none select-none"
          style={{ fontSize: Math.round(size * 0.28) }}
          aria-hidden
        >
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{initials}</span>
        </span>
      )}
    </span>
  );
}
