-- Grant Data API access on the public schema.
-- Without these, anonymous & authenticated users get "permission denied for table X"
-- BEFORE RLS even runs. RLS controls *which rows* are visible; these grants control
-- whether the table is reachable at all.

set search_path = public;

grant usage on schema public to anon, authenticated;

-- authenticated (incl. anonymous Supabase users with aud=authenticated):
--   full DML; RLS narrows the rows.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- anon (truly unauthenticated): read-only on a few public-ish tables.
grant select on achievements_catalog to anon;

-- Sequences (in case identity columns get added later)
grant usage, select on all sequences in schema public to anon, authenticated;

-- Functions
grant execute on all functions in schema public to anon, authenticated;

-- Default privileges for any FUTURE objects in public, so we don't have to repeat this.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
