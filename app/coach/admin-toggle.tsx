"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setAdmin } from "@/lib/actions/coach";

export function AdminToggle({
  profileId,
  isAdmin,
  disabled = false,
}: {
  profileId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  if (disabled) return null;

  return (
    <Button
      size="sm"
      variant={isAdmin ? "secondary" : "ghost"}
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setAdmin(profileId, !isAdmin);
        })
      }
    >
      {pending ? "…" : isAdmin ? "Admin entziehen" : "Admin geben"}
    </Button>
  );
}
