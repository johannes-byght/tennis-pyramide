-- Multi-pyramid support: allow multiple active seasons per club.
-- Each pyramid = one active season. Players and invite codes are assigned
-- to a specific season/pyramid.

-- 1. Add season_id to profiles (which pyramid this player is in)
alter table profiles
  add column if not exists season_id uuid references seasons(id) on delete set null;

-- 2. Add season_id to invite_codes (new players join this pyramid)
alter table invite_codes
  add column if not exists season_id uuid references seasons(id) on delete set null;

-- 3. Add season_id to challenges (challenge belongs to a pyramid)
alter table challenges
  add column if not exists season_id uuid references seasons(id) on delete set null;

-- 4. Populate existing rows from the currently active season per club
update profiles p
  set season_id = s.id
  from seasons s
  where s.club_id = p.club_id and s.is_active = true and p.role = 'player';

update challenges c
  set season_id = s.id
  from seasons s
  where s.club_id = c.club_id and s.is_active = true;

-- 5. Drop the one-active-season-per-club unique constraint
drop index if exists seasons_one_active_per_club;

-- 6. redeem_invite: use invite_codes.season_id; set profiles.season_id after placement
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

  if not found then raise exception 'invalid_code'; end if;
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

  v_is_admin := (v_invite.role = 'coach');

  insert into profiles (id, club_id, nickname, initials, age_group, avatar_seed, recovery_code_hash, role, is_admin)
    values (auth.uid(), v_invite.club_id, p_nickname, p_initials,
            nullif(p_age_group, ''), p_nickname, p_recovery_code_hash, v_invite.role, v_is_admin)
    returning * into v_profile;

  update invite_codes set used_count = used_count + 1 where code = p_code;

  if v_invite.role = 'player' then
    -- Prefer the pyramid the invite code was created for; fall back to any active season.
    v_active_season := v_invite.season_id;
    if v_active_season is null then
      select id into v_active_season
        from seasons where club_id = v_invite.club_id and is_active
        order by started_at desc limit 1;
    end if;
    if v_active_season is not null then
      perform place_at_bottom(v_profile.id, v_active_season);
      update profiles set season_id = v_active_season where id = v_profile.id;
    end if;
  end if;

  return v_profile;
end
$$;

grant execute on function redeem_invite(text, text, text, text, text) to authenticated;

-- 7. decline_challenge: use challenges.season_id directly; also handle same-row swap
create or replace function public.decline_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenger_id uuid;
  v_opponent_id   uuid;
  v_status        text;
  v_caller        uuid := auth.uid();
  v_season_id     uuid;
  v_pos_c         ladder_positions%rowtype;
  v_pos_o         ladder_positions%rowtype;
begin
  select challenger_id, opponent_id, status, season_id
  into v_challenger_id, v_opponent_id, v_status, v_season_id
  from challenges where id = p_challenge_id;

  if not found then
    raise exception 'Challenge nicht gefunden';
  end if;

  if v_caller != v_challenger_id and v_caller != v_opponent_id then
    raise exception 'Keine Berechtigung';
  end if;

  if v_status = 'pending' and v_caller = v_opponent_id and v_season_id is not null then
    select * into v_pos_c from ladder_positions
      where profile_id = v_challenger_id and season_id = v_season_id;
    select * into v_pos_o from ladder_positions
      where profile_id = v_opponent_id and season_id = v_season_id;

    -- Swap if challenger was lower-ranked (lower row, or behind in same row)
    if v_pos_c.profile_id is not null and v_pos_o.profile_id is not null
       and (v_pos_c.row > v_pos_o.row
            or (v_pos_c.row = v_pos_o.row and v_pos_c.col > v_pos_o.col)) then

      -- 1. DELETE opponent to free their slot
      delete from ladder_positions
        where profile_id = v_opponent_id and season_id = v_season_id;

      -- 2. Move challenger UP into the now-free opponent slot
      update ladder_positions set
        row       = v_pos_o.row,
        col       = v_pos_o.col,
        top_since = case when v_pos_o.row = 1 then now() else v_pos_c.top_since end
      where profile_id = v_challenger_id and season_id = v_season_id;

      -- 3. Re-insert opponent at challenger's old slot
      insert into ladder_positions (
        profile_id, season_id, row, col,
        matches_played, wins, losses, current_streak, best_streak, last_match_at,
        days_on_top, top_since
      ) values (
        v_opponent_id, v_season_id, v_pos_c.row, v_pos_c.col,
        v_pos_o.matches_played, v_pos_o.wins, v_pos_o.losses,
        v_pos_o.current_streak, v_pos_o.best_streak, v_pos_o.last_match_at,
        case when v_pos_o.row = 1
          then v_pos_o.days_on_top + greatest(0, floor(extract(epoch from (now() - coalesce(v_pos_o.top_since, now()))) / 86400))::int
          else v_pos_o.days_on_top end,
        null
      );
    end if;
  end if;

  update challenges
  set status = 'declined', responded_at = now()
  where id = p_challenge_id;
end;
$$;

grant execute on function public.decline_challenge(uuid) to authenticated;
