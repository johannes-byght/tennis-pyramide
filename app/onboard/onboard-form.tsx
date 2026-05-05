"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redeemInviteAction } from "@/lib/actions/onboard";

export function OnboardForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [role, setRole] = useState<"player" | "coach">("player");
  const [copied, setCopied] = useState(false);

  if (recoveryCode) {
    const next = role === "coach" ? "/coach" : "/feed";
    return (
      <Card className="mt-8 animate-pop-in">
        <CardBody className="space-y-4 text-center">
          <div className="text-5xl">🔐</div>
          <h2 className="font-display text-2xl">Dein Anmelde-Code</h2>
          <p className="text-sm text-muted">
            Schreibe ihn auf oder mach einen Screenshot. Mit diesem Code meldest du dich auf einem anderen Gerät an.
            Wir speichern ihn nicht im Klartext, also nicht verlieren.
          </p>
          <div className="rounded-card bg-court-50 dark:bg-court-800/30 border border-court-200 dark:border-court-700 px-5 py-4 font-mono text-xl tracking-wider select-all">
            {recoveryCode}
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(recoveryCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? "Kopiert ✓" : "Kopieren"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                router.push(next);
                router.refresh();
              }}
            >
              Los geht's
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <form
      className="mt-8 space-y-3"
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const result = await redeemInviteAction(fd);
          if (result.ok) {
            setRole(result.role);
            setRecoveryCode(result.recoveryCode);
          } else setError(result.error);
        })
      }
    >
      <Card>
        <CardBody className="space-y-4">
          <Field label="Vereins-Code" hint="Bekommst du von deinem Trainer.">
            <Input name="code" placeholder="TENNIS-..." required autoCapitalize="characters" autoComplete="off" />
          </Field>
          <Field label="Nickname" hint="3–16 Zeichen, sichtbar für Mitspieler.">
            <Input name="nickname" placeholder="z.B. AceAlex" required autoComplete="off" />
          </Field>
          <Field label="Initialen (optional)" hint="2–3 Buchstaben, z.B. JM">
            <Input name="initials" placeholder="JM" maxLength={3} autoComplete="off" />
          </Field>
          <Field label="Altersgruppe (optional)">
            <select
              name="ageGroup"
              className="h-12 w-full rounded-pill bg-card border border-border px-5 text-base focus:outline-none focus:ring-2 focus:ring-court-300"
              defaultValue=""
            >
              <option value="">Keine Angabe</option>
              <option value="U12">U12</option>
              <option value="U14">U14</option>
              <option value="U16">U16</option>
              <option value="U18">U18</option>
              <option value="open">Offen</option>
            </select>
          </Field>
        </CardBody>
      </Card>

      {error && (
        <Card className="border-clay">
          <CardBody className="text-sm text-clay-dark">{error}</CardBody>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Mache dich startklar…" : "Beitreten"}
      </Button>

      <p className="text-center text-xs text-muted">
        Wir speichern keinen Klarnamen, kein Geburtsdatum, keine E-Mail.
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-muted">{hint}</span>}
    </label>
  );
}
