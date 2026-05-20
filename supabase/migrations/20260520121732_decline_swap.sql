-- When the higher-ranked player (opponent) declines a pending challenge,
-- their position is swapped with the challenger as a walkover penalty.
-- All other decline cases (challenger withdrawing, counter-related) just update status.

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
  select challenger_id, opponent_id, status
  into v_challenger_id, v_opponent_id, v_status
  from challenges where id = p_challenge_id;

  if not found then
    raise exception 'Challenge nicht gefunden';
  end if;

  if v_caller != v_challenger_id and v_caller != v_opponent_id then
    raise exception 'Keine Berechtigung';
  end if;

  -- Only swap when: a pending challenge is declined by the opponent (higher-ranked player)
  if v_status = 'pending' and v_caller = v_opponent_id then
    select s.id into v_season_id
    from seasons s
    join profiles p on p.club_id = s.club_id
    where p.id = v_caller and s.is_active = true
    limit 1;

    if v_season_id is not null then
      select * into v_pos_c from ladder_positions
        where profile_id = v_challenger_id and season_id = v_season_id;
      select * into v_pos_o from ladder_positions
        where profile_id = v_opponent_id and season_id = v_season_id;

      -- Only swap if challenger was actually lower (higher row = lower in pyramid)
      if v_pos_c.profile_id is not null and v_pos_o.profile_id is not null
         and v_pos_c.row > v_pos_o.row then

        -- Move challenger up to opponent's old position
        update ladder_positions set
          row       = v_pos_o.row,
          col       = v_pos_o.col,
          top_since = case when v_pos_o.row = 1 then now() else v_pos_c.top_since end
        where profile_id = v_challenger_id and season_id = v_season_id;

        -- Move opponent down, banking days_on_top if they were at the top
        update ladder_positions set
          row       = v_pos_c.row,
          col       = v_pos_c.col,
          days_on_top = case when v_pos_o.row = 1
            then days_on_top + greatest(0, floor(extract(epoch from (now() - coalesce(top_since, now()))) / 86400))::int
            else days_on_top end,
          top_since = case when v_pos_o.row = 1 then null else top_since end
        where profile_id = v_opponent_id and season_id = v_season_id;
      end if;
    end if;
  end if;

  update challenges
  set status = 'declined', responded_at = now()
  where id = p_challenge_id;
end;
$$;

grant execute on function public.decline_challenge(uuid) to authenticated;
