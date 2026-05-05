"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hashRecoveryCode } from "@/lib/utils";

export type LoginResult =
  | { ok: true; role: "player" | "coach" }
  | { ok: false; error: string };

function syntheticEmail(userId: string): string {
  return `tp-${userId}@anon.tennis-pyramide.app`;
}

export async function loginWithCodeAction(formData: FormData): Promise<LoginResult> {
  const raw = (formData.get("code") as string | null)?.trim() ?? "";
  if (raw.length < 8) return { ok: false, error: "Code zu kurz." };

  const codeHash = await hashRecoveryCode(raw);

  const admin = await createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("recovery_code_hash", codeHash)
    .maybeSingle();

  if (!profile) return { ok: false, error: "Code ungültig." };

  const email = syntheticEmail(profile.id);

  // Lazy-set email + password on the auth user the first time someone re-logs in.
  // Idempotent: re-setting the same values is fine. We do this here (not at onboarding)
  // because setting a password rotates the user's current session — which would log the
  // user out mid-flow during onboarding.
  const { error: adminErr } = await admin.auth.admin.updateUserById(profile.id, {
    email,
    password: raw,
    email_confirm: true,
  });
  if (adminErr) return { ok: false, error: "Login fehlgeschlagen. Code prüfen." };

  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({ email, password: raw });
  if (error) return { ok: false, error: "Login fehlgeschlagen. Code prüfen." };

  return { ok: true, role: profile.role };
}
