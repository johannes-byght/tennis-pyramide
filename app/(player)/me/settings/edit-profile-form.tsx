"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { updateProfileAction } from "@/lib/actions/profile";

interface Props {
  nickname: string;
  initials: string | null;
}

export function EditProfileForm({ nickname, initials }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="font-medium">Profil bearbeiten</div>
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              setError(null);
              setSuccess(false);
              const r = await updateProfileAction(fd);
              if (!r.ok) setError(r.error);
              else setSuccess(true);
            })
          }
          className="space-y-3"
        >
          <div className="space-y-1">
            <label className="text-xs text-muted block" htmlFor="nickname">
              Nickname (3–16 Zeichen)
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              defaultValue={nickname}
              minLength={3}
              maxLength={16}
              required
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-court-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted block" htmlFor="initials">
              Initialen (optional, max. 3 Buchstaben)
            </label>
            <input
              id="initials"
              name="initials"
              type="text"
              defaultValue={initials ?? ""}
              maxLength={3}
              className="w-full rounded-xl border border-sand-300 bg-sand-50 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-court-500"
            />
          </div>
          {error && <div className="text-xs text-clay-dark">{error}</div>}
          {success && <div className="text-xs text-court-600">Gespeichert ✓</div>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Speichern…" : "Speichern"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
