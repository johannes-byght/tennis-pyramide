"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPyramid } from "@/lib/actions/coach";

export function NewSeasonForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await createPyramid(name.trim() || `Pyramide ${new Date().getFullYear()}`);
          if (!r.ok) return setError(r.error ?? "Fehler");
          setName("");
          router.refresh();
        });
      }}
    >
      <Input
        placeholder="Name der Pyramide, z.B. Jungen"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Anlegen"}
      </Button>
      {error && <span className="text-xs text-clay-dark">{error}</span>}
    </form>
  );
}
