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

  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(profile.id),
    password: raw,
  });

  if (error) return { ok: false, error: "Login fehlgeschlagen. Code prüfen." };

  return { ok: true, role: profile.role };
}
