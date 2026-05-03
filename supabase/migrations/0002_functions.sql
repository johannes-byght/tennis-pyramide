-- sixseven-tennis: server-seitige Funktionen für die Pyramide
-- redeem_invite + confirm_match (atomarer Positionstausch + XP + Achievements)

set search_path = public;

-- ============================================================================
-- place_at_bottom: hängt einen Spieler unten in die Pyramide.
-- Reihe N hat N Plätze. Wir füllen die unterste, noch nicht volle Reihe auf.
-- ============================================================================

create or replace function place_at_bottom(p_profile_id uuid, p_season_id uuid) returns ladder_positions
language plpgsql security definer set search_path = public as $$
declare
  v_max_row int;
  v_count_in_max int;
  v_target_row int;
  v_target_col int;
  v_pos ladder_positions%rowtype;
begin
  select coalesce(max(row), 0) into v_max_row
    from ladder_positions where season_id = p_season_id;

  if v_max_row = 0 then
    v_target_row := 1;
    v_target_col := 1;
  else
    select count(*) into v_count_in_max
      from ladder_positions where season_id = p_season_id and row = v_max_row;
    if v_count_in_max < v_max_row then
      v_target_row := v_max_row;
      v_target_col := v_count_in_max + 1;
    else
      v_target_row := v_max_row + 1;
      v_target_col := 1;
    end if;
  end if;

  insert into ladder_positions (profile_id, season_id, row, col)
    values (p_profile_id, p_season_id, v_target_row, v_target_col)
    returning * into v_pos;

  return v_pos;
end
$$;

-- ============================================================================
-- redeem_invite: anonymous user redeems code → profile (+ladder pos if player)
-- ============================================================================

create or replace function redeem_invite(
  p_code text,
  p_nickname text,
  p_initials text,
  p_age_group text,
  p_recovery_code_hash text
) returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_invite invite_codes%rowtype;
  v_profile profiles%rowtype;
  v_active_season uuid;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_invite from invite_codes where code = p_code for update;

  if not found then
    raise exception 'invalid_code';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'expired_code';
  end if;
  if v_invite.used_count >= v_invite.max_uses then
    raise exception 'code_exhausted';
  end if;

  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'profile_exists';
  end if;

  if length(coalesce(p_nickname, '')) < 3 or length(p_nickname) > 16 then
    raise exception 'invalid_nickname_length';
  end if;
  if p_nickname !~ '^[A-Za-z0-9_\-]{3,16}$' then
    raise exception 'invalid_nickname_format';
  end if;

  if exists (select 1 from profiles where club_id = v_invite.club_id and lower(nickname) = lower(p_nickname)) then
    raise exception 'nickname_taken';
  end if;

  -- Coaches sind automatisch Admins; Spieler nicht.
  v_is_admin := (v_invite.role = 'coach');

  insert into profiles (id, club_id, nickname, initials, age_group, avatar_seed, recovery_code_hash, role, is_admin)
    values (auth.uid(), v_invite.club_id, p_nickname, p_initials,
            nullif(p_age_group, ''), p_nickname, p_recovery_code_hash, v_invite.role, v_is_admin)
    returning * into v_profile;

  update invite_codes set used_count = used_count + 1 where code = p_code;

  -- Nur Spieler bekommen einen Pyramidenplatz.
  if v_invite.role = 'player' then
    select id into v_active_season from seasons where club_id = v_invite.club_id and is_active limit 1;
    if v_active_season is not null then
      perform place_at_bottom(v_profile.id, v_active_season);
    end if;
  end if;

  return v_profile;
end
$$;

grant execute on function redeem_invite(text, text, text, text, text) to authenticated;

-- ============================================================================
-- award_xp: insert event + update profile total + level
-- ============================================================================

create or replace function award_xp(p_profile_id uuid, p_kind text, p_xp int, p_ref uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_new_level int;
begin
  insert into xp_events (profile_id, kind, xp_delta, ref_id) values (p_profile_id, p_kind, p_xp, p_ref);
  update profiles set total_xp = total_xp + p_xp where id = p_profile_id returning total_xp into v_total;
  v_new_level := greatest(1, floor(sqrt(v_total::float / 50))::int + 1);
  update profiles set level = v_new_level where id = p_profile_id and level <> v_new_level;
end
$$;

-- ============================================================================
-- award_achievement: insert if not exists, awarding XP
-- ============================================================================

create or replace function award_achievement(p_profile_id uuid, p_code text, p_match_id uuid default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_xp int;
begin
  if exists (select 1 from profile_achievements where profile_id = p_profile_id and achievement_code = p_code) then
    return false;
  end if;
  select xp_reward into v_xp from achievements_catalog where code = p_code;
  if v_xp is null then
    return false;
  end if;
  insert into profile_achievements (profile_id, achievement_code, match_id) values (p_profile_id, p_code, p_match_id);
  perform award_xp(p_profile_id, 'achievement:' || p_code, v_xp, p_match_id);
  insert into notifications (profile_id, kind, payload) values
    (p_profile_id, 'achievement_unlocked', jsonb_build_object('code', p_code));
  return true;
end
$$;

-- ============================================================================
-- evaluate_achievements
-- ============================================================================

create or replace function evaluate_achievements(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_winner ladder_positions%rowtype;
  v_loser ladder_positions%rowtype;
  v_distinct_opponents int;
  v_recent_count int;
  v_played_hour int;
  v_lost_first_set boolean;
begin
  select * into v_match from matches where id = p_match_id;
  select * into v_winner from ladder_positions where profile_id = v_match.winner_id and season_id = v_match.season_id;
  select * into v_loser from ladder_positions where profile_id = v_match.loser_id and season_id = v_match.season_id;

  -- first_match: beide
  perform award_achievement(v_match.winner_id, 'first_match', p_match_id);
  perform award_achievement(v_match.loser_id, 'first_match', p_match_id);

  perform award_achievement(v_match.winner_id, 'first_win', p_match_id);

  -- ten_matches
  if v_winner.matches_played >= 10 then
    perform award_achievement(v_match.winner_id, 'ten_matches', p_match_id);
  end if;
  if v_loser.matches_played >= 10 then
    perform award_achievement(v_match.loser_id, 'ten_matches', p_match_id);
  end if;

  -- ladder_climb: Match war ein Aufstieg
  if v_match.position_swap then
    perform award_achievement(v_match.winner_id, 'ladder_climb', p_match_id);
  end if;

  -- comeback_kid: Sieger hat ersten Satz verloren
  v_lost_first_set := (
    coalesce((v_match.sets->0->>'p1')::int, 0) < coalesce((v_match.sets->0->>'p2')::int, 0)
      and v_match.recorded_by = v_match.winner_id
  ) or (
    coalesce((v_match.sets->0->>'p1')::int, 0) > coalesce((v_match.sets->0->>'p2')::int, 0)
      and v_match.recorded_by = v_match.loser_id
  );
  if v_lost_first_set then
    perform award_achievement(v_match.winner_id, 'comeback_kid', p_match_id);
  end if;

  -- hot_week
  select count(*) into v_recent_count from matches
    where status = 'confirmed'
      and (winner_id = v_match.winner_id or loser_id = v_match.winner_id)
      and played_at >= now() - interval '7 days';
  if v_recent_count >= 3 then
    perform award_achievement(v_match.winner_id, 'hot_week', p_match_id);
  end if;
  select count(*) into v_recent_count from matches
    where status = 'confirmed'
      and (winner_id = v_match.loser_id or loser_id = v_match.loser_id)
      and played_at >= now() - interval '7 days';
  if v_recent_count >= 3 then
    perform award_achievement(v_match.loser_id, 'hot_week', p_match_id);
  end if;

  -- club_native: 5 unterschiedliche Gegner
  select count(distinct opp) into v_distinct_opponents from (
    select case when winner_id = v_match.winner_id then loser_id else winner_id end as opp
      from matches where status = 'confirmed' and (winner_id = v_match.winner_id or loser_id = v_match.winner_id)
  ) t;
  if v_distinct_opponents >= 5 then
    perform award_achievement(v_match.winner_id, 'club_native', p_match_id);
  end if;

  -- streaks
  if v_winner.current_streak >= 3 then
    perform award_achievement(v_match.winner_id, 'streak_3', p_match_id);
  end if;
  if v_winner.current_streak >= 5 then
    perform award_achievement(v_match.winner_id, 'streak_5', p_match_id);
  end if;

  -- night_owl
  v_played_hour := extract(hour from v_match.played_at);
  if v_played_hour >= 21 or v_played_hour < 5 then
    perform award_achievement(v_match.winner_id, 'night_owl', p_match_id);
    perform award_achievement(v_match.loser_id, 'night_owl', p_match_id);
  end if;
end
$$;

-- ============================================================================
-- confirm_match: Bestätigung durch nicht-Eintragenden Beteiligten →
-- ggf. Positionstausch in der Pyramide + XP + Achievements
-- ============================================================================

create or replace function confirm_match(p_match_id uuid) returns matches
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_winner_pos ladder_positions%rowtype;
  v_loser_pos ladder_positions%rowtype;
  v_should_swap boolean := false;
begin
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;

  if auth.uid() not in (v_match.winner_id, v_match.loser_id) then
    raise exception 'not_participant';
  end if;
  if auth.uid() = v_match.recorded_by then
    raise exception 'cannot_confirm_own_entry';
  end if;
  if v_match.status <> 'unconfirmed' then
    raise exception 'already_resolved';
  end if;

  select * into v_winner_pos from ladder_positions
    where profile_id = v_match.winner_id and season_id = v_match.season_id for update;
  select * into v_loser_pos from ladder_positions
    where profile_id = v_match.loser_id and season_id = v_match.season_id for update;

  -- Positionstausch nur, wenn Sieger eine Reihe TIEFER stand (höhere row-Zahl)
  -- und der Verlierer genau eine Reihe darüber.
  if v_winner_pos.profile_id is not null
     and v_loser_pos.profile_id is not null
     and v_winner_pos.row = v_loser_pos.row + 1 then
    v_should_swap := true;
  end if;

  if v_should_swap then
    -- Swap ohne Parkplatz: winner-Zeile löschen, loser auf winner's alten Slot,
    -- winner mit gemerkten Stats auf loser's alten Slot wieder einfügen.
    delete from ladder_positions
      where profile_id = v_match.winner_id and season_id = v_match.season_id;
    update ladder_positions set row = v_winner_pos.row, col = v_winner_pos.col
      where profile_id = v_match.loser_id and season_id = v_match.season_id;
    insert into ladder_positions (
      profile_id, season_id, row, col,
      matches_played, wins, losses, current_streak, best_streak, last_match_at
    ) values (
      v_match.winner_id, v_match.season_id, v_loser_pos.row, v_loser_pos.col,
      v_winner_pos.matches_played, v_winner_pos.wins, v_winner_pos.losses,
      v_winner_pos.current_streak, v_winner_pos.best_streak, v_winner_pos.last_match_at
    );
  end if;

  -- Stats aktualisieren (Sieger)
  update ladder_positions set
    matches_played = matches_played + 1,
    wins = wins + 1,
    current_streak = current_streak + 1,
    best_streak = greatest(best_streak, current_streak + 1),
    last_match_at = now()
    where profile_id = v_match.winner_id and season_id = v_match.season_id;

  update ladder_positions set
    matches_played = matches_played + 1,
    losses = losses + 1,
    current_streak = 0,
    last_match_at = now()
    where profile_id = v_match.loser_id and season_id = v_match.season_id;

  update matches set
    status = 'confirmed',
    confirmed_by = auth.uid(),
    confirmed_at = now(),
    position_swap = v_should_swap
    where id = p_match_id
    returning * into v_match;

  perform award_xp(v_match.winner_id, 'match_win', 30, p_match_id);
  perform award_xp(v_match.loser_id, 'match_played', 10, p_match_id);

  perform evaluate_achievements(p_match_id);

  insert into notifications (profile_id, kind, payload) values
    (v_match.winner_id, 'match_confirmed',
      jsonb_build_object('match_id', p_match_id, 'climbed', v_should_swap)),
    (v_match.loser_id, 'match_confirmed',
      jsonb_build_object('match_id', p_match_id, 'climbed', false));

  return v_match;
end
$$;

grant execute on function confirm_match(uuid) to authenticated;

-- ============================================================================
-- dispute_match
-- ============================================================================

create or replace function dispute_match(p_match_id uuid, p_reason text) returns matches
language plpgsql security definer set search_path = public as $$
declare v_match matches%rowtype;
begin
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if auth.uid() not in (v_match.winner_id, v_match.loser_id) then raise exception 'not_participant'; end if;
  if v_match.status <> 'unconfirmed' then raise exception 'already_resolved'; end if;
  update matches set status = 'disputed', dispute_reason = p_reason where id = p_match_id returning * into v_match;
  return v_match;
end
$$;

grant execute on function dispute_match(uuid, text) to authenticated;

-- ============================================================================
-- set_admin: Admin-Rolle für Spieler im eigenen Verein vergeben/entziehen.
-- Nur durch andere Admins (Coaches oder Spieler-Admins) im selben Verein.
-- ============================================================================

create or replace function set_admin(p_profile_id uuid, p_value boolean) returns profiles
language plpgsql security definer set search_path = public as $$
declare
  v_caller profiles%rowtype;
  v_target profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_caller from profiles where id = auth.uid();
  if not found then raise exception 'no_profile'; end if;
  if not (v_caller.role = 'coach' or v_caller.is_admin) then raise exception 'forbidden'; end if;

  select * into v_target from profiles where id = p_profile_id for update;
  if not found then raise exception 'target_not_found'; end if;
  if v_target.club_id <> v_caller.club_id then raise exception 'wrong_club'; end if;
  if v_target.role = 'coach' then raise exception 'coach_is_always_admin'; end if;
  if v_target.id = v_caller.id then raise exception 'cannot_modify_self'; end if;

  update profiles set is_admin = p_value where id = p_profile_id returning * into v_target;
  return v_target;
end
$$;

grant execute on function set_admin(uuid, boolean) to authenticated;

-- ============================================================================
-- delete_my_account
-- Spieler verschwinden aus der Pyramide, die Lücke wird automatisch durch das
-- Nachrücken neuer Spieler nicht geschlossen — bewusst, damit andere Plätze stabil bleiben.
-- ============================================================================

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  delete from profiles where id = v_uid;
end
$$;

grant execute on function delete_my_account() to authenticated;
