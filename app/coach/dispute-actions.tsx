"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveDispute } from "@/lib/actions/coach";

export function DisputeActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await resolveDispute(matchId, "confirm");
              if (!r.ok) setError(r.error ?? "Fehler");
              else router.refresh();
            })
          }
        >
          Trotzdem werten
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await resolveDispute(matchId, "reject");
              if (!r.ok) setError(r.error ?? "Fehler");
              else router.refresh();
            })
          }
        >
          Verwerfen
        </Button>
      </div>
      {error && <div className="text-xs text-clay-dark">{error}</div>}
    </div>
  );
}
