"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { counterChallenge, respondChallenge } from "@/lib/actions/challenges";

function localDt(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

type Props = {
  id: string;
  status: "pending" | "accepted" | "countered" | "expired";
  isIncoming: boolean;
  opponentId: string;
  opponentName: string;
};

export function ChallengeActions({ id, status, isIncoming, opponentId, opponentName }: Props) {
  const [pending, start] = useTransition();
  const [showCounter, setShowCounter] = useState(false);
  const [showDeclineWarning, setShowDeclineWarning] = useState(false);
  const [counterDate, setCounterDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const minDt = localDt(new Date());
  const maxDt = localDt(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

  function respond(action: "accept" | "decline" | "cancel") {
    start(async () => {
      setError(null);
      const r = await respondChallenge(id, action);
      if (!r.ok) setError(r.error ?? "Fehler");
    });
  }

  function sendCounter() {
    start(async () => {
      setError(null);
      const r = await counterChallenge(id, counterDate);
      if (!r.ok) return setError(r.error ?? "Fehler");
      setShowCounter(false);
    });
  }

  if (status === "expired") {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond("cancel")}>
        Schließen
      </Button>
    );
  }

  if (status === "accepted") {
    return (
      <Link
        href={`/challenges/new?opponent=${opponentId}&challenge=${id}`}
        className="rounded-pill bg-court-600 text-white px-3 py-1.5 text-xs font-medium"
      >
        Eintragen
      </Link>
    );
  }

  // pending, opponent is viewing → can accept / decline / counter
  if (status === "pending" && isIncoming) {
    if (showDeclineWarning) {
      return (
        <div className="flex flex-col gap-1.5 items-end max-w-[200px]">
          <p className="text-xs text-clay-dark text-right">
            Achtung: Wenn du ablehnst, tauscht du deinen Platz mit {opponentName}.
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="danger" disabled={pending} onClick={() => respond("decline")}>
              Ja, ablehnen
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowDeclineWarning(false)}>
              ✕
            </Button>
          </div>
          {error && <p className="text-xs text-clay-dark">{error}</p>}
        </div>
      );
    }
    if (showCounter) {
      return (
        <div className="flex flex-col gap-1.5 items-end min-w-0">
          <Input
            type="datetime-local"
            value={counterDate}
            min={minDt}
            max={maxDt}
            onChange={(e) => setCounterDate(e.target.value)}
            className="text-xs w-44"
          />
          <div className="flex gap-1">
            <Button size="sm" disabled={pending || !counterDate} onClick={sendCounter}>
              Senden
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowCounter(false)}>
              ✕
            </Button>
          </div>
          {error && <p className="text-xs text-clay-dark">{error}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 items-end">
        <Button size="sm" disabled={pending} onClick={() => respond("accept")}>
          Annehmen
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowCounter(true)}>
          Gegenvorschlag
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowDeclineWarning(true)}>
          Ablehnen
        </Button>
      </div>
    );
  }

  // pending, challenger is viewing → can only cancel
  if (status === "pending" && !isIncoming) {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond("cancel")}>
        Abbrechen
      </Button>
    );
  }

  // countered: challenger needs to respond to opponent's counter
  if (status === "countered" && !isIncoming) {
    if (showCounter) {
      return (
        <div className="flex flex-col gap-1.5 items-end min-w-0">
          <Input
            type="datetime-local"
            value={counterDate}
            min={minDt}
            max={maxDt}
            onChange={(e) => setCounterDate(e.target.value)}
            className="text-xs w-44"
          />
          <div className="flex gap-1">
            <Button size="sm" disabled={pending || !counterDate} onClick={sendCounter}>
              Senden
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowCounter(false)}>
              ✕
            </Button>
          </div>
          {error && <p className="text-xs text-clay-dark">{error}</p>}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1 items-end">
        <Button size="sm" disabled={pending} onClick={() => respond("accept")}>
          Annehmen
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setShowCounter(true)}>
          Neuer Vorschlag
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond("decline")}>
          Ablehnen
        </Button>
      </div>
    );
  }

  // countered: opponent is waiting for challenger's answer → can withdraw
  if (status === "countered" && isIncoming) {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond("decline")}>
        Zurückziehen
      </Button>
    );
  }

  return null;
}
