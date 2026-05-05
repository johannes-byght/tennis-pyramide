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
  const rawInput = (formData.get("code") as string | null)?.trim() ?? "";
  // Normalize: uppercase + strip all whitespace inside (user might paste with
  // extra spaces or type without dashes).
  const compact = rawInput.toUpperCase().replace(/\s+/g, "");
  if (compact.length < 8) return { ok: false, error: "Code zu kurz." };

  // Codes are issued in the format AAAA-BBBB-CCCC-DDDD. If the user typed it
  // without dashes (16 chars), reinsert them so the hash matches.
  const normalized =
    compact.length === 16 && !compact.includes("-")
      ? `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}`
      : compact;

  const codeHash = await hashRecoveryCode(normalized);

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
    password: normalized,
    email_confirm: true,
  });
  if (adminErr) return { ok: false, error: "Login fehlgeschlagen. Code prüfen." };

  const supabase = await createClient();
  await supabase.auth.signOut();

  const { error } = await supabase.auth.signInWithPassword({ email, password: normalized });
  if (error) return { ok: false, error: "Login fehlgeschlagen. Code prüfen." };

  return { ok: true, role: profile.role };
}
