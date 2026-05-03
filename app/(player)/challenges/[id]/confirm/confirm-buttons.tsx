"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { confirmMatch, disputeMatch } from "@/lib/actions/challenges";

export function ConfirmMatchButtons({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await confirmMatch(matchId);
            if (!r.ok) return setError(r.error);
            router.push("/feed");
            router.refresh();
          })
        }
      >
        {pending ? "Bestätige…" : "✓ Stimmt – bestätigen"}
      </Button>

      {!showDispute ? (
        <Button variant="ghost" className="w-full" type="button" onClick={() => setShowDispute(true)}>
          Stimmt nicht
        </Button>
      ) : (
        <Card className="border-clay">
          <CardBody className="space-y-3">
            <div className="text-sm font-medium">Was stimmt nicht?</div>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 280))}
              placeholder="Kurz erklären – Trainer entscheidet."
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowDispute(false)}>
                Zurück
              </Button>
              <Button
                variant="danger"
                disabled={pending || reason.trim().length < 3}
                onClick={() =>
                  start(async () => {
                    const r = await disputeMatch(matchId, reason.trim());
                    if (!r.ok) return setError(r.error);
                    router.push("/feed");
                    router.refresh();
                  })
                }
              >
                Streit melden
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <Card className="border-clay">
          <CardBody className="text-sm text-clay-dark">{error}</CardBody>
        </Card>
      )}
    </div>
  );
}
