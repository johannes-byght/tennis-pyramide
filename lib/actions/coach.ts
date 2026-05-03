"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(prefix = "TENNIS"): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const tail = Array.from(bytes, (b) => ALPHA[b % ALPHA.length]).join("");
  return `${prefix}-${tail.slice(0, 4)}-${tail.slice(4, 8)}`;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" as const };
  const { data: me } = await supabase
    .from("profiles")
    .select("club_id, role, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const profile = me as { club_id: string; role: "player" | "coach"; is_admin: boolean } | null;
  if (!profile) return { error: "Profil nicht gefunden" as const };
  if (profile.role !== "coach" && !profile.is_admin) return { error: "Keine Admin-Rechte" as const };
  return { supabase, user, profile };
}

export async function generateInviteCodes(input: { count: number; role: "player" | "coach"; maxUses: number }) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase, user, profile } = ctx;

  const count = Math.max(1, Math.min(20, input.count));
  const rows = Array.from({ length: count }, () => ({
    code: randomCode(),
    club_id: profile.club_id,
    role: input.role,
    max_uses: Math.max(1, Math.min(100, input.maxUses)),
    created_by: user.id,
  }));

  const { error, data } = await supabase.from("invite_codes").insert(rows).select("code");
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/coach");
  return { ok: true as const, codes: ((data ?? []) as { code: string }[]).map((d) => d.code) };
}

export async function resolveDispute(matchId: string, decision: "confirm" | "reject") {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase } = ctx;
  if (decision === "reject") {
    const { error } = await supabase.from("matches").update({ status: "rejected" }).eq("id", matchId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    await supabase.from("matches").update({ status: "unconfirmed" }).eq("id", matchId);
    const { error } = await supabase.rpc("confirm_match", { p_match_id: matchId });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/coach");
  revalidatePath("/feed");
  return { ok: true as const };
}

export async function startNewSeason(name: string) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase, profile } = ctx;
  await supabase
    .from("seasons")
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq("club_id", profile.club_id)
    .eq("is_active", true);
  const { error } = await supabase.from("seasons").insert({ club_id: profile.club_id, name, is_active: true });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/coach");
  revalidatePath("/ranking");
  return { ok: true as const };
}

export async function setAdmin(profileId: string, value: boolean) {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase } = ctx;
  const { error } = await supabase.rpc("set_admin", { p_profile_id: profileId, p_value: value });
  if (error) {
    const map: Record<string, string> = {
      forbidden: "Keine Admin-Rechte.",
      coach_is_always_admin: "Trainer haben immer Adminrechte.",
      cannot_modify_self: "Eigene Adminrechte können nicht geändert werden.",
      wrong_club: "Spieler ist nicht im selben Verein.",
      target_not_found: "Spieler nicht gefunden.",
    };
    const key = (error.message || "").split("\n")[0]?.replace(/.*P0001:\s*/, "").trim();
    return { ok: false as const, error: map[key] ?? error.message };
  }
  revalidatePath("/coach");
  return { ok: true as const };
}
