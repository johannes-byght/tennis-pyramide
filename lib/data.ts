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
  if (!user) redirect("/onboard?why=requireMe_no_user");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboard?why=requireMe_no_profile");
  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("club_id", (profile as Profile).club_id)
    .eq("is_active", true)
    .maybeSingle();
  return {
    user: { id: user.id },
    profile: profile as Profile,
    activeSeason: (season as Season | null) ?? null,
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
  status: string;
  message: string | null;
  proposed_at: string | null;
  created_at: string;
  challenger: Pick<Profile, "id" | "nickname" | "avatar_seed">;
  opponent: Pick<Profile, "id" | "nickname" | "avatar_seed">;
};

export async function fetchMyChallenges(profileId: string): Promise<ChallengeWithProfiles[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select(
      `id, status, message, proposed_at, created_at,
       challenger:profiles!challenges_challenger_id_fkey(id, nickname, avatar_seed),
       opponent:profiles!challenges_opponent_id_fkey(id, nickname, avatar_seed)`,
    )
    .or(`challenger_id.eq.${profileId},opponent_id.eq.${profileId}`)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ChallengeWithProfiles[];
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
