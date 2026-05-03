"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, Swords, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAYER_TABS = [
  { href: "/feed", label: "Feed", Icon: Home },
  { href: "/ranking", label: "Rang", Icon: Trophy },
  { href: "/challenges", label: "Spielen", Icon: Swords },
  { href: "/me", label: "Ich", Icon: User },
];

const COACH_TABS = [
  { href: "/ranking", label: "Pyramide", Icon: Trophy },
  { href: "/coach", label: "Verwaltung", Icon: ShieldCheck },
];

export function TabBar({ role }: { role: "player" | "coach" }) {
  const pathname = usePathname() ?? "";
  const tabs = role === "coach" ? COACH_TABS : PLAYER_TABS;
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] pointer-events-none"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="pointer-events-auto rounded-pill bg-card/90 backdrop-blur border border-border shadow-cozy flex items-center justify-around p-1.5">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-pill py-2 px-3 text-[11px] font-medium transition",
                  active
                    ? "bg-court-600 text-white"
                    : "text-muted hover:text-fg",
                )}
              >
                <Icon size={20} strokeWidth={2.2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
