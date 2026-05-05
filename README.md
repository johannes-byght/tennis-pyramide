# Tennis Pyramide

Mobile-first Vereins-Tennis-App im Stil von Kickbase. Spieler fordern sich heraus, spielen Matches, klettern in der Pyramide nach oben — mit XP, Levels und Achievements. Datenschutz steht im Zentrum: Spieler melden sich nur mit Nickname an, kein Klarname, keine E-Mail.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Realtime) · PWA.

## Features (MVP)

- Vereins-Onboarding über Einladungscode (Trainer generiert)
- Anonymer Spieler-Login + persönlicher Anmelde-Code für Multi-Device
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

### 5. Trainer-Account anlegen (Bootstrap)

Da Trainer-Accounts genauso über Einladungscodes laufen wie Spieler, musst du den initialen Code per SQL einmal selbst setzen — danach läuft alles über die UI.

```sql
with c as (
  insert into clubs (name, slug)
  values ('Mein Verein', 'mein-verein')
  returning id
)
insert into seasons (club_id, name, is_active)
select id, 'Saison 2026', true from c;

insert into invite_codes (code, club_id, role, max_uses)
select 'COACH-START', id, 'coach', 1 from clubs where slug = 'mein-verein';
```

Dann `/onboard` aufrufen, Code `COACH-START` einlösen, Nickname wählen, Anmelde-Code aufschreiben. Das Profil bekommt automatisch `role='coach'` und `is_admin=true`. Im Trainer-Dashboard generierst du danach Spieler-Codes.

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
- Anmelde-Code: Beim Onboarding wird ein 16-stelliger Code angezeigt, dessen SHA-256-Hash sowie eine synthetische E-Mail (`tp-<uuid>@anon.tennis-pyramide.app`) am Auth-User gesetzt werden. Über `/login` kann sich der User damit auf einem anderen Gerät anmelden — der Klartext-Code wird **nicht** gespeichert.
- Trainer-Accounts haben eine E-Mail (verantwortliche Person nach DSGVO).
- Row-Level-Security stellt sicher, dass nur Mitglieder des eigenen Vereins Daten sehen.
- Datenexport (`/api/account/export`) liefert JSON mit allen personenbezogenen Daten.
- Account-Löschung kaskadiert über `delete_my_account()` — Matches bleiben anonym in der Vereinsstatistik (notwendig fürs Ranking anderer Spieler).

## Roadmap (post-MVP)

- Web-Push-Notifications (VAPID)
- Skill-Challenges mit Foto/Video-Upload
- Squads (Teams im Verein)
- Wochen-Quests, Saison-Pass
- Auf-/Abstiegs-Logik für Liga-System
- Doppel-Matches
- i18n (aktuell nur Deutsch)
