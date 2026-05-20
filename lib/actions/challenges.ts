"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canChallenge, isValidMatchup } from "@/lib/ladder";
import { challengeSchema, counterSchema, matchEntrySchema } from "@/lib/validation/forms";
import { determineWinner } from "@/lib/scoring";
import type { LadderPosition, Profile } from "@/lib/supabase/types";

async function loadActiveContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet" as const };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, club_id, role")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return { error: "Profil nicht gefunden" as const };
  const profile = me as Pick<Profile, "id" | "club_id" | "role">;
  if (profile.role !== "player") return { error: "Trainer können nicht spielen" as const };
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("club_id", profile.club_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!season) return { error: "Keine aktive Saison" as const };
  return { supabase, user, profile, seasonId: (season as { id: string }).id };
}

async function loadSlot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  seasonId: string,
): Promise<{ row: number; col: number } | null> {
  const { data } = await supabase
    .from("ladder_positions")
    .select("row, col")
    .eq("profile_id", profileId)
    .eq("season_id", seasonId)
    .maybeSingle();
  return (data as Pick<LadderPosition, "row" | "col"> | null) ?? null;
}

export async function createChallenge(input: { opponentId: string; proposedAt?: string; message?: string }) {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ungültig" };

  const ctx = await loadActiveContext();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase, user, profile, seasonId } = ctx;

  const [mySlot, oppSlot] = await Promise.all([
    loadSlot(supabase, user.id, seasonId),
    loadSlot(supabase, parsed.data.opponentId, seasonId),
  ]);

  if (!canChallenge(mySlot, oppSlot)) {
    return {
      ok: false as const,
      error: "Du kannst nur Spieler:innen aus deiner Reihe oder genau einer Reihe darüber herausfordern.",
    };
  }

  const { error } = await supabase.from("challenges").insert({
    club_id: profile.club_id,
    challenger_id: user.id,
    opponent_id: parsed.data.opponentId,
    proposed_at: parsed.data.proposedAt || null,
    message: parsed.data.message || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/challenges");
  revalidatePath("/feed");
  return { ok: true as const };
}

export async function respondChallenge(id: string, action: "accept" | "decline" | "cancel") {
  const supabase = await createClient();

  if (action === "decline") {
    const { error } = await supabase.rpc("decline_challenge", { p_challenge_id: id });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/challenges");
    revalidatePath("/ranking");
    return { ok: true as const };
  }

  const status = action === "accept" ? "accepted" : "cancelled";
  const { error } = await supabase
    .from("challenges")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/challenges");
  return { ok: true as const };
}

export async function counterChallenge(id: string, proposedAt: string) {
  const parsed = counterSchema.safeParse({ proposedAt });
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ungültig" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenges")
    .update({ status: "countered", counter_proposed_at: proposedAt, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/challenges");
  return { ok: true as const };
}

export async function recordMatch(input: {
  challengeId?: string;
  opponentId: string;
  iWon: boolean;
  format: "best_of_3" | "pro_set" | "tiebreak_only";
  sets: { p1: number; p2: number }[];
}) {
  const parsed = matchEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Ungültig" };

  const ctx = await loadActiveContext();
  if ("error" in ctx) return { ok: false as const, error: ctx.error };
  const { supabase, user, profile, seasonId } = ctx;

  if (parsed.data.challengeId) {
    // Sicherstellen, dass die Challenge wirklich diese beiden Spieler verbindet.
    const { data: ch } = await supabase
      .from("challenges")
      .select("challenger_id, opponent_id, club_id")
      .eq("id", parsed.data.challengeId)
      .maybeSingle();
    const challenge = ch as { challenger_id: string; opponent_id: string; club_id: string } | null;
    if (!challenge) return { ok: false as const, error: "Challenge nicht gefunden" };
    const involved =
      (challenge.challenger_id === user.id && challenge.opponent_id === parsed.data.opponentId) ||
      (challenge.opponent_id === user.id && challenge.challenger_id === parsed.data.opponentId);
    if (!involved) return { ok: false as const, error: "Nicht an dieser Challenge beteiligt" };
  }

  // Positionen immer prüfen — auch bei Challenge-Matches. Haben sich die Positionen
  // inzwischen verschoben (z.B. durch einen Aufstieg), ist das Match nicht mehr gültig.
  const [mySlot, oppSlot] = await Promise.all([
    loadSlot(supabase, user.id, seasonId),
    loadSlot(supabase, parsed.data.opponentId, seasonId),
  ]);
  if (!isValidMatchup(mySlot, oppSlot)) {
    return {
      ok: false as const,
      error:
        "Match nicht mehr erlaubt: Die Positionen haben sich seit der Challenge zu weit verschoben. Bitte Challenge abbrechen.",
    };
  }

  const sets = parsed.data.sets;
  const winnerLabel = determineWinner(sets, parsed.data.format);
  if (winnerLabel === null) return { ok: false as const, error: "Ergebnis ist nicht abgeschlossen." };
  const recorderIsWinner = parsed.data.iWon;
  const winnerIsRecorder = winnerLabel === "p1";
  if (winnerIsRecorder !== recorderIsWinner) {
    return { ok: false as const, error: "Sätze passen nicht zur Auswahl 'Ich habe gewonnen'." };
  }

  const winnerId = recorderIsWinner ? user.id : parsed.data.opponentId;
  const loserId = recorderIsWinner ? parsed.data.opponentId : user.id;

  const { error: insertErr } = await supabase.from("matches").insert({
    club_id: profile.club_id,
    season_id: seasonId,
    challenge_id: parsed.data.challengeId ?? null,
    winner_id: winnerId,
    loser_id: loserId,
    sets,
    format: parsed.data.format,
    recorded_by: user.id,
  });
  if (insertErr) return { ok: false as const, error: insertErr.message };

  if (parsed.data.challengeId) {
    await supabase.from("challenges").update({ status: "played" }).eq("id", parsed.data.challengeId);
  }

  revalidatePath("/feed");
  revalidatePath("/challenges");
  return { ok: true as const };
}

export async function confirmMatch(matchId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_match", { p_match_id: matchId });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  revalidatePath("/ranking");
  return { ok: true as const };
}

export async function disputeMatch(matchId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispute_match", { p_match_id: matchId, p_reason: reason });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  return { ok: true as const };
}
