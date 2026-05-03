"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondChallenge } from "@/lib/actions/challenges";

type Props = {
  id: string;
  status: "pending" | "accepted";
  isIncoming: boolean;
  opponentId: string;
};

export function ChallengeActions({ id, status, isIncoming, opponentId }: Props) {
  const [pending, start] = useTransition();
  if (status === "pending" && isIncoming) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await respondChallenge(id, "accept");
            })
          }
        >
          Annehmen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await respondChallenge(id, "decline");
            })
          }
        >
          Ablehnen
        </Button>
      </div>
    );
  }
  if (status === "pending" && !isIncoming) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await respondChallenge(id, "cancel");
          })
        }
      >
        Abbrechen
      </Button>
    );
  }
  // accepted
  return (
    <Link
      href={`/challenges/new?opponent=${opponentId}&challenge=${id}`}
      className="rounded-pill bg-court-600 text-white px-3 py-1.5 text-xs font-medium"
    >
      Eintragen
    </Link>
  );
}
