// Hand-rolled types for the MVP. Once you connect a real Supabase project,
// run `supabase gen types typescript --project-id <id> > lib/supabase/types.ts`
// to replace this with auto-generated types.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Profile = {
  id: string;
  club_id: string;
  nickname: string;
  initials: string | null;
  age_group: "U12" | "U14" | "U16" | "U18" | "open" | null;
  avatar_seed: string;
  recovery_code_hash: string | null;
  role: "player" | "coach";
  is_admin: boolean;
  level: number;
  total_xp: number;
  created_at: string;
};

export type Club = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Season = {
  id: string;
  club_id: string;
  name: string;
  started_at: string;
  ends_at: string | null;
  is_active: boolean;
};

export type LadderPosition = {
  profile_id: string;
  season_id: string;
  row: number;
  col: number;
  matches_played: number;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
  last_match_at: string | null;
  days_on_top: number;
  top_since: string | null;
};

export type Challenge = {
  id: string;
  club_id: string;
  challenger_id: string;
  opponent_id: string;
  proposed_at: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined" | "expired" | "played" | "cancelled";
  created_at: string;
  responded_at: string | null;
};

export type Match = {
  id: string;
  club_id: string;
  season_id: string;
  challenge_id: string | null;
  winner_id: string;
  loser_id: string;
  sets: { p1: number; p2: number }[];
  format: "best_of_3" | "pro_set" | "tiebreak_only";
  played_at: string;
  recorded_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  status: "unconfirmed" | "confirmed" | "disputed" | "rejected";
  dispute_reason: string | null;
  position_swap: boolean;
  created_at: string;
};

export type LadderRow = {
  profile_id: string;
  club_id: string;
  nickname: string;
  initials: string | null;
  avatar_seed: string;
  level: number;
  total_xp: number;
  is_admin: boolean;
  season_id: string;
  row: number;
  col: number;
  matches_played: number;
  wins: number;
  losses: number;
  current_streak: number;
  best_streak: number;
  last_match_at: string | null;
  total_days_on_top: number;
};

export type ProfileAchievement = {
  profile_id: string;
  achievement_code: string;
  earned_at: string;
  match_id: string | null;
};

export type Reaction = {
  match_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
};

export type Notification = {
  id: string;
  profile_id: string;
  kind: string;
  payload: Record<string, Json>;
  read_at: string | null;
  created_at: string;
};

export type InviteCode = {
  code: string;
  club_id: string;
  role: "player" | "coach";
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
};
