-- Test club: TC Beispiel
-- 1 Trainer (coach) + 3 Spieler, alle mit festen Recovery-Codes zum Testen.
--
-- Recovery-Codes (zum Einloggen):
--   Trainer  "Trainer01"  → TEST-COAC-H001-XXXX
--   Spieler  "Anna"       → TEST-P001-ABCD-1111
--   Spieler  "Ben"        → TEST-P002-ABCD-2222
--   Spieler  "Chris"      → TEST-P003-ABCD-3333
--
-- Ausführen im Supabase SQL-Editor.

set search_path = public;

-- ── Verein & Saison ────────────────────────────────────────────────────────────

insert into clubs (id, name, slug) values
  ('2917c4fa-9782-4914-98b5-66cf0893381c', 'TC Beispiel', 'tc-beispiel')
  on conflict (id) do nothing;

insert into seasons (id, club_id, name, is_active, started_at) values
  ('e90fb071-8268-4636-a7a7-1a06a734314d',
   '2917c4fa-9782-4914-98b5-66cf0893381c',
   'Saison 2026', true, now())
  on conflict (id) do nothing;

insert into invite_codes (code, club_id, role, max_uses) values
  ('BEISPIEL-PLAYER', '2917c4fa-9782-4914-98b5-66cf0893381c', 'player', 20),
  ('BEISPIEL-COACH',  '2917c4fa-9782-4914-98b5-66cf0893381c', 'coach',  5)
  on conflict (code) do nothing;

-- ── Auth-User (anonymous) ──────────────────────────────────────────────────────

insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  ('00aac4fc-3dbf-40dc-aa70-1a33a722f35f',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  ('9d5f9ce4-f058-4ca0-aab1-6357b1460423',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  ('d148aff8-2a77-47d2-872d-d5a074f703c2',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  ('c29b9799-accf-4174-8274-6a1e01edb4a0',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', '')
on conflict (id) do nothing;

-- ── Profile ────────────────────────────────────────────────────────────────────

insert into profiles (id, club_id, nickname, initials, avatar_seed, recovery_code_hash, role, is_admin) values
  ('00aac4fc-3dbf-40dc-aa70-1a33a722f35f',
   '2917c4fa-9782-4914-98b5-66cf0893381c',
   'Trainer01', 'TR', 'Trainer01',
   '1a8512625d6d946809d76c06a6b2b2eebba7f7bc94479164ff145a8e4a67a8bc',
   'coach', true),
  ('9d5f9ce4-f058-4ca0-aab1-6357b1460423',
   '2917c4fa-9782-4914-98b5-66cf0893381c',
   'Anna', 'AN', 'Anna',
   'e38e6facc1a5f955fcdcf76250214d0a51d123c0a2c1ebfe55b84b42dcde87f2',
   'player', false),
  ('d148aff8-2a77-47d2-872d-d5a074f703c2',
   '2917c4fa-9782-4914-98b5-66cf0893381c',
   'Ben', 'BE', 'Ben',
   '24e89841877a7421223a1ed05e3ade6e01ff792aefa8ab61a390b0162199bd87',
   'player', false),
  ('c29b9799-accf-4174-8274-6a1e01edb4a0',
   '2917c4fa-9782-4914-98b5-66cf0893381c',
   'Chris', 'CH', 'Chris',
   '2e561d91c112445cf619d43fb552d70c25fff68d2cbe7de0a8a3d9bf17ded099',
   'player', false)
on conflict (id) do nothing;

-- ── Ladder-Positionen ─────────────────────────────────────────────────────────
-- Pyramide: Anna (Reihe 1), Ben + Chris (Reihe 2)

insert into ladder_positions (profile_id, season_id, row, col, top_since) values
  ('9d5f9ce4-f058-4ca0-aab1-6357b1460423',
   'e90fb071-8268-4636-a7a7-1a06a734314d', 1, 1, now()),
  ('d148aff8-2a77-47d2-872d-d5a074f703c2',
   'e90fb071-8268-4636-a7a7-1a06a734314d', 2, 1, null),
  ('c29b9799-accf-4174-8274-6a1e01edb4a0',
   'e90fb071-8268-4636-a7a7-1a06a734314d', 2, 2, null)
on conflict (profile_id, season_id) do nothing;
