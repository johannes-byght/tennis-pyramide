-- Allow club admins to confirm a disputed match via "Trotzdem werten".
-- Previously confirm_match rejected non-participants, so the coach got a
-- 'not_participant' exception when resolving disputes.

set search_path = public;

create or replace function confirm_match(p_match_id uuid) returns matches
language plpgsql security definer set search_path = public as $$
declare
  v_match matches%rowtype;
  v_winner_pos ladder_positions%rowtype;
  v_loser_pos ladder_positions%rowtype;
  v_should_swap boolean := false;
  v_caller_is_admin boolean := false;
  v_caller_club uuid;
begin
  select * into v_match from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;

  select club_id, (role = 'coach' or is_admin) into v_caller_club, v_caller_is_admin
    from profiles where id = auth.uid();

  if not v_caller_is_admin and auth.uid() not in (v_match.winner_id, v_match.loser_id) then
    raise exception 'not_participant';
  end if;
  if not v_caller_is_admin and auth.uid() = v_match.recorded_by then
    raise exception 'cannot_confirm_own_entry';
  end if;
  if v_caller_is_admin and v_caller_club is distinct from v_match.club_id then
    raise exception 'wrong_club';
  end if;
  if v_match.status <> 'unconfirmed' then
    raise exception 'already_resolved';
  end if;

  select * into v_winner_pos from ladder_positions
    where profile_id = v_match.winner_id and season_id = v_match.season_id for update;
  select * into v_loser_pos from ladder_positions
    where profile_id = v_match.loser_id and season_id = v_match.season_id for update;

  if v_winner_pos.profile_id is not null
     and v_loser_pos.profile_id is not null
     and v_winner_pos.row = v_loser_pos.row + 1 then
    v_should_swap := true;
  end if;

  if v_should_swap then
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
