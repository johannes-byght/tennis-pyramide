import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      const role = (profile as { role: "player" | "coach" }).role;
      redirect(role === "coach" ? "/coach" : "/feed");
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 pt-12 pb-24">
      <div className="text-center">
        <div className="text-5xl mb-2">🔐</div>
        <h1 className="font-display text-4xl tracking-tight">Anmelden</h1>
        <p className="mt-2 text-muted">Mit deinem Anmelde-Code von einem anderen Gerät einloggen.</p>
      </div>

      <LoginForm />

      <p className="mt-8 text-center text-xs text-muted">
        Noch kein Account?{" "}
        <Link className="underline underline-offset-4" href="/onboard">
          Hier mit Vereins-Code beitreten
        </Link>
      </p>
    </main>
  );
}
