-- Fix: avoid unique constraint violation during position swap.
-- Order: DELETE opponent first → UPDATE challenger to freed slot → INSERT opponent at old challenger slot.

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

        -- 1. DELETE opponent to free their slot (bank days_on_top if they were on top)
        delete from ladder_positions
          where profile_id = v_opponent_id and season_id = v_season_id;

        -- 2. Move challenger UP into the now-free opponent slot (no conflict)
        update ladder_positions set
          row       = v_pos_o.row,
          col       = v_pos_o.col,
          top_since = case when v_pos_o.row = 1 then now() else v_pos_c.top_since end
        where profile_id = v_challenger_id and season_id = v_season_id;

        -- 3. Re-insert opponent at challenger's old slot (challenger has moved, no conflict)
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
  end if;

  update challenges
  set status = 'declined', responded_at = now()
  where id = p_challenge_id;
end;
$$;

grant execute on function public.decline_challenge(uuid) to authenticated;
