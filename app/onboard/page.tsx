import Link from "next/link";
import { OnboardForm } from "./onboard-form";

// Kein server-side redirect-if-profile-exists hier: nach erfolgreichem Redeem
// soll der User auf der Onboard-Page bleiben können um seinen Anmelde-Code zu
// kopieren. Returning-User mit Profil landen via "/" (root page) korrekt im
// Feed/Coach-Dashboard.

export default async function OnboardPage() {
  return (
    <main className="mx-auto max-w-md px-5 pt-12 pb-24">
      <div className="text-center">
        <div className="text-5xl mb-2">🎾</div>
        <h1 className="font-display text-4xl tracking-tight">Tennis Pyramide</h1>
        <p className="mt-2 text-muted">Vereins-Tennis. Challenge. Rangliste. Spaß.</p>
      </div>

      <OnboardForm />

      <p className="mt-8 text-center text-xs text-muted">
        Schon dabei?{" "}
        <Link className="underline underline-offset-4" href="/login">
          Mit Anmelde-Code einloggen
        </Link>
      </p>
    </main>
  );
}
