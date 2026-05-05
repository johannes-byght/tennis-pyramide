"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginWithCodeAction } from "@/lib/actions/login";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-8 space-y-3"
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const result = await loginWithCodeAction(fd);
          if (result.ok) {
            router.push(result.role === "coach" ? "/coach" : "/feed");
            router.refresh();
          } else setError(result.error);
        })
      }
    >
      <Card>
        <CardBody className="space-y-4">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Anmelde-Code</span>
            <Input
              name="code"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              required
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-wider"
            />
            <span className="block mt-1 text-xs text-muted">
              Den Code hast du beim ersten Beitritt bekommen.
            </span>
          </label>
        </CardBody>
      </Card>

      {error && (
        <Card className="border-clay">
          <CardBody className="text-sm text-clay-dark">{error}</CardBody>
        </Card>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Prüfe Code…" : "Anmelden"}
      </Button>
    </form>
  );
}
