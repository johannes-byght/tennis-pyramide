"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveDispute } from "@/lib/actions/coach";

export function DisputeActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await resolveDispute(matchId, "confirm");
            router.refresh();
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
            await resolveDispute(matchId, "reject");
            router.refresh();
          })
        }
      >
        Verwerfen
      </Button>
    </div>
  );
}
