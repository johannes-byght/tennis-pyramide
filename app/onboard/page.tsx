import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardForm } from "./onboard-form";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profile) redirect("/feed");
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-12 pb-24">
      <div className="text-center">
        <div className="text-5xl mb-2">🎾</div>
        <h1 className="font-display text-4xl tracking-tight">sixseven</h1>
        <p className="mt-2 text-muted">Vereins-Tennis. Challenge. Rangliste. Spaß.</p>
      </div>

      <OnboardForm />

      <p className="mt-8 text-center text-xs text-muted">
        Trainer/-in?{" "}
        <Link className="underline underline-offset-4" href="/coach/sign-in">
          Hier zum Trainer-Login
        </Link>
      </p>
    </main>
  );
}
