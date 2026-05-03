-- sixseven-tennis: initial schema (Pyramide / Ladder-Edition)
-- Run with: supabase db reset (oder supabase db push)

set search_path = public;

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- role:
--   'player' = nimmt an der Pyramide teil
--   'coach'  = Trainer, ausschließlich Verwaltung, NICHT in der Rangliste
-- is_admin:
--   true für jeden coach (gesetzt beim Onboarding) und optional für einzelne Spieler.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  nickname text not null,
  initials text,
  age_group text check (age_group in ('U12','U14','U16','U18','open')),
  avatar_seed text not null,
  recovery_code_hash text,
  role text not null default 'player' check (role in ('player','coach')),
  is_admin boolean not null default false,
  level int not null default 1,
  total_xp int not null default 0,
  created_at timestamptz not null default now(),
  unique (club_id, nickname)
);

create index profiles_club_idx on profiles(club_id);

create table invite_codes (
  code text primary key,
  club_id uuid not null references clubs(id) on delete cascade,
  role text not null default 'player' check (role in ('player','coach')),
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index invite_codes_club_idx on invite_codes(club_id);

create table seasons (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true
);

create unique index seasons_one_active_per_club on seasons(club_id) where is_active;

-- Pyramide / Ladder
-- Reihe 1 (Spitze) hat 1 Platz, Reihe 2 hat 2 Plätze, Reihe N hat N Plätze.
-- (row, col) ist eindeutig je Saison. Coaches bekommen keinen Eintrag.
create table ladder_positions (
  profile_id uuid not null references profiles(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  row int not null check (row >= 1),
  col int not null check (col >= 1),
  matches_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_match_at timestamptz,
  primary key (profile_id, season_id),
  constraint col_within_row check (col <= row)
);

create unique index ladder_unique_slot on ladder_positions(season_id, row, col);
create index ladder_season_pos_idx on ladder_positions(season_id, row, col);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  challenger_id uuid not null references profiles(id) on delete cascade,
  opponent_id uuid not null references profiles(id) on delete cascade,
  proposed_at timestamptz,
  message text,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','expired','played','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (challenger_id <> opponent_id)
);

create index challenges_opponent_idx on challenges(opponent_id, status);
create index challenges_challenger_idx on challenges(challenger_id, status);

create table matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  challenge_id uuid references challenges(id) on delete set null,
  winner_id uuid not null references profiles(id) on delete cascade,
  loser_id uuid not null references profiles(id) on delete cascade,
  sets jsonb not null,
  format text not null default 'best_of_3'
    check (format in ('best_of_3','pro_set','tiebreak_only')),
  played_at timestamptz not null default now(),
  recorded_by uuid not null references profiles(id) on delete cascade,
  confirmed_by uuid references profiles(id) on delete set null,
  confirmed_at timestamptz,
  status text not null default 'unconfirmed'
    check (status in ('unconfirmed','confirmed','disputed','rejected')),
  dispute_reason text,
  -- Bei einem Aufstieg in der Pyramide: positiv für den Aufsteiger.
  position_swap boolean not null default false,
  created_at timestamptz not null default now(),
  check (winner_id <> loser_id)
);

create index matches_season_played_idx on matches(season_id, played_at desc);
create index matches_winner_idx on matches(winner_id);
create index matches_loser_idx on matches(loser_id);
create index matches_club_status_idx on matches(club_id, status);

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  xp_delta int not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index xp_events_profile_idx on xp_events(profile_id, created_at desc);

create table achievements_catalog (
  code text primary key,
  title text not null,
  description text not null,
  icon text not null,
  xp_reward int not null default 50,
  sort_order int not null default 100
);

create table profile_achievements (
  profile_id uuid not null references profiles(id) on delete cascade,
  achievement_code text not null references achievements_catalog(code) on delete cascade,
  earned_at timestamptz not null default now(),
  match_id uuid references matches(id) on delete set null,
  primary key (profile_id, achievement_code)
);

create table reactions (
  match_id uuid not null references matches(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (match_id, profile_id, emoji)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_unread_idx on notifications(profile_id, created_at desc) where read_at is null;

-- ============================================================================
-- Achievement catalog seed
-- ============================================================================

insert into achievements_catalog (code, title, description, icon, xp_reward, sort_order) values
  ('first_match', 'Erstes Match', 'Spiele dein erstes bestätigtes Match.', '🎾', 50, 10),
  ('ten_matches', 'Stammspieler', 'Spiele 10 bestätigte Matches.', '🏟️', 150, 20),
  ('first_win', 'Erster Sieg', 'Gewinne dein erstes Match.', '🥇', 100, 30),
  ('ladder_climb', 'Aufsteiger', 'Schlage einen Spieler aus der Reihe über dir.', '🪜', 200, 40),
  ('comeback_kid', 'Comeback Kid', 'Gewinne ein Match nach Satzrückstand.', '🔥', 150, 50),
  ('hot_week', 'Heiße Woche', '3 Matches in 7 Tagen.', '☀️', 100, 60),
  ('club_native', 'Vereinstreu', 'Spiele gegen 5 verschiedene Mitglieder.', '🤝', 150, 70),
  ('streak_3', 'Heiß gelaufen', '3 Siege in Folge.', '⚡', 150, 80),
  ('streak_5', 'Unaufhaltsam', '5 Siege in Folge.', '💫', 250, 90),
  ('night_owl', 'Nachtschwärmer', 'Spiele ein Match nach 21 Uhr.', '🌙', 50, 100)
  on conflict (code) do nothing;

-- ============================================================================
-- Helper view: ladder
-- Coaches haben keine ladder_position → tauchen hier nicht auf.
-- ============================================================================

create or replace view ladder
  with (security_invoker = true) as
  select
    p.id as profile_id,
    p.club_id,
    p.nickname,
    p.initials,
    p.avatar_seed,
    p.level,
    p.total_xp,
    p.is_admin,
    lp.season_id,
    lp.row,
    lp.col,
    lp.matches_played,
    lp.wins,
    lp.losses,
    lp.current_streak,
    lp.best_streak,
    lp.last_match_at
  from profiles p
  join ladder_positions lp on lp.profile_id = p.id
  where p.role = 'player';

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table clubs enable row level security;
alter table profiles enable row level security;
alter table invite_codes enable row level security;
alter table seasons enable row level security;
alter table ladder_positions enable row level security;
alter table challenges enable row level security;
alter table matches enable row level security;
alter table xp_events enable row level security;
alter table profile_achievements enable row level security;
alter table reactions enable row level security;
alter table notifications enable row level security;
alter table achievements_catalog enable row level security;

-- Helper: own club_id
create or replace function auth_club_id() returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from profiles where id = auth.uid()
$$;

-- Returns true if the current user can manage the club (coach OR admin player).
create or replace function auth_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(role = 'coach' or is_admin, false)
  from profiles where id = auth.uid()
$$;

-- Public read of achievement catalog (no PII)
create policy "achievements catalog readable" on achievements_catalog
  for select using (true);

-- Clubs: only own club readable
create policy "clubs: own readable" on clubs
  for select using (id = auth_club_id());

-- Profiles: own club readable, only self editable; admins can grant/revoke is_admin via RPC.
create policy "profiles: same club readable" on profiles
  for select using (club_id = auth_club_id());

create policy "profiles: self update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Invite codes: only admins of own club
create policy "invite_codes: admin read" on invite_codes
  for select using (club_id = auth_club_id() and auth_is_admin());

create policy "invite_codes: admin manage" on invite_codes
  for all using (club_id = auth_club_id() and auth_is_admin())
  with check (club_id = auth_club_id() and auth_is_admin());

-- Seasons: own club read; admin manage
create policy "seasons: club read" on seasons
  for select using (club_id = auth_club_id());

create policy "seasons: admin manage" on seasons
  for all using (club_id = auth_club_id() and auth_is_admin())
  with check (club_id = auth_club_id() and auth_is_admin());

-- Ladder positions: club-scoped read
create policy "ladder: club read" on ladder_positions
  for select using (
    exists (select 1 from profiles p where p.id = ladder_positions.profile_id and p.club_id = auth_club_id())
  );

-- Challenges: read if club; create/update only by participants (and only between Spielern)
create policy "challenges: club read" on challenges
  for select using (club_id = auth_club_id());

create policy "challenges: challenger create" on challenges
  for insert with check (challenger_id = auth.uid() and club_id = auth_club_id());

create policy "challenges: participants update" on challenges
  for update using (auth.uid() in (challenger_id, opponent_id))
  with check (auth.uid() in (challenger_id, opponent_id));

-- Matches: club read; insert allowed if recorded_by is self & participant; update by participants/admin
create policy "matches: club read" on matches
  for select using (club_id = auth_club_id());

create policy "matches: participant insert" on matches
  for insert with check (
    recorded_by = auth.uid()
    and club_id = auth_club_id()
    and auth.uid() in (winner_id, loser_id)
  );

create policy "matches: participant or admin update" on matches
  for update using (
    auth.uid() in (winner_id, loser_id)
    or auth_is_admin()
  ) with check (
    auth.uid() in (winner_id, loser_id)
    or auth_is_admin()
  );

-- XP events: read own; system writes via SECURITY DEFINER fn
create policy "xp_events: own read" on xp_events
  for select using (profile_id = auth.uid());

-- Profile achievements: club readable
create policy "achievements: club read" on profile_achievements
  for select using (
    exists (select 1 from profiles p where p.id = profile_id and p.club_id = auth_club_id())
  );

-- Reactions: club read, self write
create policy "reactions: club read" on reactions
  for select using (
    exists (select 1 from matches m where m.id = match_id and m.club_id = auth_club_id())
  );

create policy "reactions: self write" on reactions
  for insert with check (profile_id = auth.uid());

create policy "reactions: self delete" on reactions
  for delete using (profile_id = auth.uid());

-- Notifications: own only
create policy "notifications: own read" on notifications
  for select using (profile_id = auth.uid());

create policy "notifications: own update" on notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
