import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Club, LadderPosition, LadderRow, Match, Profile, Season } from "@/lib/supabase/types";

export type Me = { user: { id: string }; profile: Profile; activeSeason: Season | null };

export async function requirePlayer(): Promise<Me> {
  const me = await requireMe();
  if (me.profile.role !== "player") redirect("/coach");
  return me;
}

export async function requireMe(): Promise<Me> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/onboard");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboard");
  const p = profile as Profile;
  let season: Season | null = null;
  if (p.season_id) {
    const { data: s } = await supabase.from("seasons").select("*").eq("id", p.season_id).maybeSingle();
    season = (s as Season | null) ?? null;
  }
  return {
    user: { id: user.id },
    profile: p,
    activeSeason: season,
  };
}

export async function fetchClub(clubId: string): Promise<Club | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();
  return (data as Club | null) ?? null;
}

export async function fetchLadder(seasonId: string): Promise<LadderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ladder")
    .select("*")
    .eq("season_id", seasonId)
    .order("row", { ascending: true })
    .order("col", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LadderRow[];
}

/** Members visible in the club: includes coaches. */
export async function fetchClubMembers(clubId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("club_id", clubId)
    .order("nickname");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

/** Players (no coaches) currently in the active season's ladder, including their position. */
export async function fetchLadderMembers(seasonId: string): Promise<LadderRow[]> {
  return fetchLadder(seasonId);
}

export async function fetchMyLadderPosition(
  profileId: string,
  seasonId: string,
): Promise<LadderPosition | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ladder_positions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("season_id", seasonId)
    .maybeSingle();
  return (data as LadderPosition | null) ?? null;
}

export type MatchWithProfiles = Match & {
  winner: Pick<Profile, "id" | "nickname" | "avatar_seed">;
  loser: Pick<Profile, "id" | "nickname" | "avatar_seed">;
};

export async function fetchRecentMatches(clubId: string, limit = 30): Promise<MatchWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `*,
       winner:profiles!matches_winner_id_fkey(id, nickname, avatar_seed),
       loser:profiles!matches_loser_id_fkey(id, nickname, avatar_seed)`,
    )
    .eq("club_id", clubId)
    .eq("status", "confirmed")
    .order("played_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as MatchWithProfiles[];
}

export type ChallengeWithProfiles = {
  id: string;
  status: "pending" | "accepted" | "countered" | "expired";
  message: string | null;
  proposed_at: string | null;
  counter_proposed_at: string | null;
  created_at: string;
  challenger: Pick<Profile, "id" | "nickname" | "avatar_seed">;
  opponent: Pick<Profile, "id" | "nickname" | "avatar_seed">;
};

export async function fetchMyChallenges(profileId: string, seasonId?: string): Promise<ChallengeWithProfiles[]> {
  const supabase = await createClient();
  let query = supabase
    .from("challenges")
    .select(
      `id, status, message, proposed_at, counter_proposed_at, created_at,
       challenger:profiles!challenges_challenger_id_fkey(id, nickname, avatar_seed),
       opponent:profiles!challenges_opponent_id_fkey(id, nickname, avatar_seed)`,
    )
    .or(`challenger_id.eq.${profileId},opponent_id.eq.${profileId}`)
    .in("status", ["pending", "accepted", "countered", "expired"]);
  if (seasonId) query = query.eq("season_id", seasonId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ChallengeWithProfiles[];
}

export type PyramidSummary = Season & { player_count: number };

export async function fetchPyramids(clubId: string): Promise<PyramidSummary[]> {
  const supabase = await createClient();
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("started_at", { ascending: true });
  if (!seasons || seasons.length === 0) return [];
  const { data: counts } = await supabase
    .from("profiles")
    .select("season_id")
    .in("season_id", (seasons as Season[]).map((s) => s.id));
  const countMap: Record<string, number> = {};
  for (const row of (counts ?? []) as { season_id: string }[]) {
    countMap[row.season_id] = (countMap[row.season_id] ?? 0) + 1;
  }
  return (seasons as Season[]).map((s) => ({ ...s, player_count: countMap[s.id] ?? 0 }));
}

export async function fetchMatchesNeedingMyAction(profileId: string): Promise<MatchWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `*,
       winner:profiles!matches_winner_id_fkey(id, nickname, avatar_seed),
       loser:profiles!matches_loser_id_fkey(id, nickname, avatar_seed)`,
    )
    .eq("status", "unconfirmed")
    .or(`winner_id.eq.${profileId},loser_id.eq.${profileId}`)
    .neq("recorded_by", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MatchWithProfiles[];
}

export async function fetchProfileWithStats(
  profileId: string,
  seasonId: string,
): Promise<{
  profile: Profile | null;
  position: LadderPosition | null;
  achievements: { achievement_code: string; earned_at: string }[];
}> {
  const supabase = await createClient();
  const [{ data: profile }, { data: position }, { data: achievements }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
    supabase.from("ladder_positions").select("*").eq("profile_id", profileId).eq("season_id", seasonId).maybeSingle(),
    supabase.from("profile_achievements").select("achievement_code, earned_at").eq("profile_id", profileId),
  ]);
  return {
    profile: (profile as Profile | null) ?? null,
    position: (position as LadderPosition | null) ?? null,
    achievements: (achievements ?? []) as { achievement_code: string; earned_at: string }[],
  };
}

export async function fetchHeadToHead(meId: string, otherId: string): Promise<{ myWins: number; theirWins: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("winner_id, loser_id")
    .eq("status", "confirmed")
    .or(`and(winner_id.eq.${meId},loser_id.eq.${otherId}),and(winner_id.eq.${otherId},loser_id.eq.${meId})`);
  let myWins = 0;
  let theirWins = 0;
  for (const m of (data as { winner_id: string }[] | null) ?? []) {
    if (m.winner_id === meId) myWins++;
    else theirWins++;
  }
  return { myWins, theirWins };
}
