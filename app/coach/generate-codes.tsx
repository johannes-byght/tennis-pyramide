"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateInviteCodes } from "@/lib/actions/coach";

export function GenerateCodes() {
  const router = useRouter();
  const [count, setCount] = useState("3");
  const [maxUses, setMaxUses] = useState("1");
  const [role, setRole] = useState<"player" | "coach">("player");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs">
          <span className="block text-muted">Anzahl</span>
          <Input value={count} onChange={(e) => setCount(e.target.value)} inputMode="numeric" />
        </label>
        <label className="block text-xs">
          <span className="block text-muted">Max. Nutzungen</span>
          <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" />
        </label>
        <label className="block text-xs">
          <span className="block text-muted">Rolle</span>
          <select
            className="h-12 w-full rounded-pill bg-card border border-border px-4"
            value={role}
            onChange={(e) => setRole(e.target.value as "player" | "coach")}
          >
            <option value="player">Spieler</option>
            <option value="coach">Trainer</option>
          </select>
        </label>
      </div>
      <Button
        size="md"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await generateInviteCodes({
              count: parseInt(count, 10) || 1,
              role,
              maxUses: parseInt(maxUses, 10) || 1,
            });
            if (!r.ok) return setError(r.error ?? "Fehler");
            router.refresh();
          })
        }
      >
        {pending ? "Erstelle…" : "Codes erstellen"}
      </Button>
      {error && <div className="text-xs text-clay-dark">{error}</div>}
    </div>
  );
}
