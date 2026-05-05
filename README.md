# Tennis Pyramide

Mobile-first Vereins-Tennis-App im Stil von Kickbase. Spieler fordern sich heraus, spielen Matches, klettern in der Pyramide nach oben — mit XP, Levels und Achievements. Datenschutz steht im Zentrum: Spieler melden sich nur mit Nickname an, kein Klarname, keine E-Mail.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Realtime) · PWA.

## Features (MVP)

- Vereins-Onboarding über Einladungscode (Trainer generiert)
- Anonymer Spieler-Login + persönlicher Recovery-Code
- Challenge-Flow: herausfordern → annehmen → Match eintragen → beidseitig bestätigen
- Elo-Rating mit Live-Rangliste pro Saison
- XP, Level und kuratierte Achievements
- Match-Feed mit Reactions
- Trainer-Dashboard: Codes, Mitglieder, Disputes, Saison-Reset
- DSGVO: Datenexport + Self-Service-Account-Löschung
- Installierbar als PWA, Dark Mode, mobile-first

## Setup

### 1. Abhängigkeiten

```bash
npm install
```

### 2. Supabase-Projekt anlegen

1. Account auf [supabase.com](https://supabase.com) erstellen, Projekt anlegen.
2. In den Projekt-Einstellungen unter **API** die Werte für URL, Anon-Key und Service-Role-Key kopieren.
3. `.env.local` mit echten Werten befüllen (siehe `.env.example`).

### 3. Datenbank-Migrationen anwenden

Im Supabase-SQL-Editor nacheinander ausführen:

1. `supabase/migrations/0001_init.sql` (Tabellen, RLS, Achievement-Katalog)
2. `supabase/migrations/0002_functions.sql` (Server-Funktionen)
3. Optional `supabase/seed/seed.sql` (Demo-Verein + Codes)

Alternativ mit der Supabase-CLI:

```bash
npx supabase link --project-ref <YOUR-PROJECT-REF>
npx supabase db push
```

### 4. Anonymous Auth aktivieren

In Supabase: **Authentication → Providers → Anonymous Sign-Ins → Enable**. Diese Methode wird für Spieler-Accounts verwendet (keine E-Mail nötig).

### 5. Trainer-Account erstellen

1. App im Browser öffnen → `/coach/sign-in`
2. E-Mail eingeben → Magic-Link in der Mail klicken
3. Im SQL-Editor manuell deinen Trainer-Eintrag setzen (das Onboarding via Code übernimmt das beim ersten Verein nicht):

```sql
-- Ersetze YOUR_AUTH_UID mit der UID aus auth.users (siehe Supabase Authentication-Tab)
insert into clubs (id, name, slug)
  values (gen_random_uuid(), 'Mein Verein', 'mein-verein');

insert into profiles (id, club_id, nickname, avatar_seed, role)
  select 'YOUR_AUTH_UID', id, 'TrainerNick', 'TrainerNick', 'coach'
  from clubs where slug = 'mein-verein';

insert into seasons (club_id, name, is_active)
  select id, 'Saison 2026', true from clubs where slug = 'mein-verein';
```

Danach kannst du im Trainer-Dashboard Codes generieren, die Spieler über `/onboard` einlösen.

### 6. Lokal starten

```bash
npm run dev
```

Öffne http://localhost:3000 — du wirst zum Onboarding weitergeleitet.

## Tests

```bash
npm test
```

Unit-Tests für `lib/elo.ts`, `lib/scoring.ts`, `lib/achievements.ts`.

## End-to-End Smoke (manuell, mobile)

1. Trainer-Login per Magic-Link, Verein und 2 Spieler-Codes anlegen.
2. Spieler A öffnet Onboarding, löst Code 1 ein, wählt Nickname „AceAlex".
3. Spieler B Onboarding mit Code 2, Nickname „TopspinTina".
4. A → `/challenges/new` → fordert B heraus.
5. B akzeptiert in der Inbox, danach Match spielen.
6. A trägt 6:4 6:3 ein, B prüft & bestätigt.
7. Rangliste zeigt aktualisierte Elo, A bekommt „Erstes Match" + „Erster Sieg".
8. Reaction (🔥) im Feed setzen.
9. PWA via Browser-Menü auf Home-Screen installieren.

## Projektstruktur

```
app/
├── (player)/                # Tab-Bar-Bereich für angemeldete Spieler
│   ├── feed/                #   - Match-Feed
│   ├── ranking/             #   - Rangliste
│   ├── challenges/          #   - Inbox + Erstellen + Bestätigen
│   ├── profile/[id]/        #   - Spielerprofil
│   └── me/                  #   - Eigenes Profil + DSGVO
├── coach/                   # Trainer-Dashboard
├── onboard/                 # Code-Einlösung
├── api/                     # Account löschen / exportieren
└── manifest.webmanifest/    # PWA-Manifest

lib/
├── elo.ts                   # pure Elo-Berechnung (getestet)
├── scoring.ts               # Satz-Validierung & Match-Auswertung
├── achievements.ts          # Katalog + Level-Progress
├── data.ts                  # Server-side Datenzugriffe
├── actions/                 # Server Actions
├── supabase/                # Supabase-Clients
└── validation/              # Zod-Schemas

supabase/
├── migrations/0001_init.sql       # Schema + RLS
├── migrations/0002_functions.sql  # confirm_match, redeem_invite, …
└── seed/seed.sql                  # Optional: Demo-Daten

components/                  # UI-Primitive (Button, Card, Avatar, TabBar)
tests/                       # Vitest-Tests
proxy.ts                     # Auth-Routen-Schutz (vorher: middleware.ts)
```

## Datenschutz

- Spieler-Accounts sind **anonyme** Supabase-Auth-Sessions, an Einladungscode + Nickname gebunden.
- Recovery: Beim Onboarding wird ein 16-stelliger Code angezeigt, dessen SHA-256-Hash gespeichert wird. Damit kann später der Account zurückgeholt werden (Recovery-Flow ist im MVP noch nicht implementiert — siehe Roadmap).
- Trainer-Accounts haben eine E-Mail (verantwortliche Person nach DSGVO).
- Row-Level-Security stellt sicher, dass nur Mitglieder des eigenen Vereins Daten sehen.
- Datenexport (`/api/account/export`) liefert JSON mit allen personenbezogenen Daten.
- Account-Löschung kaskadiert über `delete_my_account()` — Matches bleiben anonym in der Vereinsstatistik (notwendig fürs Ranking anderer Spieler).

## Roadmap (post-MVP)

- Recovery-Flow für vergessene Spieler-Codes
- Web-Push-Notifications (VAPID)
- Skill-Challenges mit Foto/Video-Upload
- Squads (Teams im Verein)
- Wochen-Quests, Saison-Pass
- Auf-/Abstiegs-Logik für Liga-System
- Doppel-Matches
- i18n (aktuell nur Deutsch)
