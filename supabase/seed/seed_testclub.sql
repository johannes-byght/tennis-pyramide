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
  ('aaaaaaaa-0000-0000-0000-000000000001', 'TC Beispiel', 'tc-beispiel')
  on conflict (id) do nothing;

insert into seasons (id, club_id, name, is_active, started_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Saison 2026', true, now())
  on conflict (id) do nothing;

insert into invite_codes (code, club_id, role, max_uses) values
  ('BEISPIEL-PLAYER', 'aaaaaaaa-0000-0000-0000-000000000001', 'player', 20),
  ('BEISPIEL-COACH',  'aaaaaaaa-0000-0000-0000-000000000001', 'coach',  5)
  on conflict (code) do nothing;

-- ── Auth-User (anonymous) ──────────────────────────────────────────────────────
-- Supabase erwartet diese Felder; encrypted_password bleibt leer (kein Passwort-Login).

insert into auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  -- Trainer
  ('cccccccc-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  -- Anna
  ('cccccccc-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  -- Ben
  ('cccccccc-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', ''),
  -- Chris
  ('cccccccc-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   null, '', now(), now(),
   '{"provider":"anonymous","providers":["anonymous"]}', '{}',
   false, '', '', '', '')
on conflict (id) do nothing;

-- ── Profile ────────────────────────────────────────────────────────────────────

insert into profiles (id, club_id, nickname, initials, avatar_seed, recovery_code_hash, role, is_admin) values
  -- Trainer
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Trainer01', 'TR', 'Trainer01',
   '1a8512625d6d946809d76c06a6b2b2eebba7f7bc94479164ff145a8e4a67a8bc',
   'coach', true),
  -- Anna
  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Anna', 'AN', 'Anna',
   'e38e6facc1a5f955fcdcf76250214d0a51d123c0a2c1ebfe55b84b42dcde87f2',
   'player', false),
  -- Ben
  ('cccccccc-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Ben', 'BE', 'Ben',
   '24e89841877a7421223a1ed05e3ade6e01ff792aefa8ab61a390b0162199bd87',
   'player', false),
  -- Chris
  ('cccccccc-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Chris', 'CH', 'Chris',
   '2e561d91c112445cf619d43fb552d70c25fff68d2cbe7de0a8a3d9bf17ded099',
   'player', false)
on conflict (id) do nothing;

-- ── Ladder-Positionen für die Spieler ─────────────────────────────────────────
-- Pyramide: Anna (Reihe 1), Ben + Chris (Reihe 2)

insert into ladder_positions (profile_id, season_id, row, col, top_since) values
  ('cccccccc-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000001', 1, 1, now()),   -- Anna, Spitze
  ('cccccccc-0000-0000-0000-000000000003',
   'bbbbbbbb-0000-0000-0000-000000000001', 2, 1, null),    -- Ben
  ('cccccccc-0000-0000-0000-000000000004',
   'bbbbbbbb-0000-0000-0000-000000000001', 2, 2, null)     -- Chris
on conflict (profile_id, season_id) do nothing;
