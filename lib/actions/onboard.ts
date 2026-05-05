"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/utils";
import { onboardSchema } from "@/lib/validation/forms";

export type OnboardResult =
  | { ok: true; recoveryCode: string; role: "player" | "coach" }
  | { ok: false; error: string };

export async function redeemInviteAction(formData: FormData): Promise<OnboardResult> {
  const parsed = onboardSchema.safeParse({
    code: formData.get("code"),
    nickname: formData.get("nickname"),
    initials: formData.get("initials") || undefined,
    ageGroup: (formData.get("ageGroup") as string) || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Eingabe ungültig" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase.auth.getUser();
  if (!existing.user) {
    const { error: signInErr } = await supabase.auth.signInAnonymously();
    if (signInErr) return { ok: false, error: signInErr.message };
  }

  const recoveryCode = generateRecoveryCode();
  const recoveryHash = await hashRecoveryCode(recoveryCode);

  const { error, data } = await supabase.rpc("redeem_invite", {
    p_code: parsed.data.code.trim(),
    p_nickname: parsed.data.nickname,
    p_initials: parsed.data.initials ?? null,
    p_age_group: parsed.data.ageGroup ?? null,
    p_recovery_code_hash: recoveryHash,
  });

  if (error) {
    const map: Record<string, string> = {
      invalid_code: "Code ist ungültig.",
      expired_code: "Code ist abgelaufen.",
      code_exhausted: "Code wurde bereits zu oft eingelöst.",
      profile_exists: "Du hast bereits ein Profil.",
      nickname_taken: "Nickname ist im Verein schon vergeben.",
      invalid_nickname_format: "Nickname-Format ungültig.",
      invalid_nickname_length: "Nickname-Länge ungültig.",
    };
    const key = (error.message || "").split("\n")[0]?.replace(/.*P0001:\s*/, "").trim();
    return { ok: false, error: map[key] ?? error.message };
  }

  const profile = data as { id: string; role: "player" | "coach" } | null;
  const role = profile?.role ?? "player";

  return { ok: true, recoveryCode, role };
}

export async function completeOnboarding() {
  redirect("/feed");
}
