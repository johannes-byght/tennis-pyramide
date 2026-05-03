-- Local dev seed: a demo club with two invite codes.
-- Run AFTER migrations and AFTER you have created an auth user that will become the coach
-- (replace COACH_AUTH_UID with the auth.uid() of your coach test user).

insert into clubs (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'TC Demo', 'tc-demo')
  on conflict (id) do nothing;

insert into seasons (id, club_id, name, is_active) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Saison 2026 Sommer', true)
  on conflict (id) do nothing;

insert into invite_codes (code, club_id, role, max_uses) values
  ('TENNIS-DEMO-001', '11111111-1111-1111-1111-111111111111', 'player', 50),
  ('TENNIS-DEMO-COACH', '11111111-1111-1111-1111-111111111111', 'coach', 5)
  on conflict (code) do nothing;
