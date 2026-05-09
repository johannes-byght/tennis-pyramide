-- Backfill top_since for row-1 players where it was never set.
-- This happens when the 0006_days_on_top migration ran but the seeding
-- missed players (e.g. no season.started_at, or player arrived via seed).
set search_path = public;

update ladder_positions lp
set top_since = coalesce(s.started_at, now())
from seasons s
where lp.season_id = s.id
  and lp.row = 1
  and lp.top_since is null;
