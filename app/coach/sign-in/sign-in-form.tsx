"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function CoachSignInForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <Card className="animate-pop-in">
        <CardBody className="text-center space-y-2">
          <div className="text-4xl">📬</div>
          <div className="font-medium">Mail unterwegs!</div>
          <p className="text-sm text-muted">Klick den Link in deiner Mail, um dich einzuloggen.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const { error: err } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/coach` },
          });
          if (err) setError(err.message);
          else setSent(true);
        });
      }}
    >
      <Card>
        <CardBody className="space-y-3">
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">E-Mail</span>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainer@verein.de"
            />
          </label>
        </CardBody>
      </Card>
      {error && (
        <Card className="border-clay">
          <CardBody className="text-sm text-clay-dark">{error}</CardBody>
        </Card>
      )}
      <Button size="lg" type="submit" className="w-full" disabled={pending || !email}>
        {pending ? "Sende…" : "Magic-Link senden"}
      </Button>
    </form>
  );
}
