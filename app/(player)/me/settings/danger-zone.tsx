"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export function DangerZone() {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="border-clay">
      <CardBody className="space-y-3">
        <div className="font-medium">Account löschen</div>
        <p className="text-xs text-muted">
          Dein Profil und deine Wertungen werden unwiderruflich entfernt. Matches bleiben anonymisiert in der
          Vereinsstatistik (notwendig fürs Ranking anderer Mitglieder).
        </p>
        {!confirm ? (
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Account löschen
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await fetch("/api/account/delete", { method: "POST" });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    return setError(j.error ?? "Löschen fehlgeschlagen");
                  }
                  router.push("/onboard");
                  router.refresh();
                })
              }
            >
              {pending ? "Lösche…" : "Endgültig löschen"}
            </Button>
          </div>
        )}
        {error && <div className="text-sm text-clay-dark">{error}</div>}
      </CardBody>
    </Card>
  );
}
