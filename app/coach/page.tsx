import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { TabBar } from "@/components/tab-bar";
import { createClient } from "@/lib/supabase/server";
import { fetchClub, fetchClubMembers, fetchPyramids, requireMe } from "@/lib/data";
import { AdminToggle } from "./admin-toggle";
import { CodeList } from "./code-list";
import { GenerateCodes } from "./generate-codes";
import { DisputeActions } from "./dispute-actions";
import { NewSeasonForm } from "./new-season-form";

export default async function CoachPage() {
  const me = await requireMe();
  const isAdmin = me.profile.role === "coach" || me.profile.is_admin;
  if (!isAdmin) redirect("/feed");

  const supabase = await createClient();
  const [{ data: codes }, members, { data: disputes }, club, pyramids] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("*, pyramid:seasons(name)")
      .eq("club_id", me.profile.club_id)
      .order("created_at", { ascending: false })
      .limit(20),
    fetchClubMembers(me.profile.club_id),
    supabase
      .from("matches")
      .select(
        `*, winner:profiles!matches_winner_id_fkey(nickname, avatar_seed), loser:profiles!matches_loser_id_fkey(nickname, avatar_seed)`,
      )
      .eq("club_id", me.profile.club_id)
      .eq("status", "disputed"),
    fetchClub(me.profile.club_id),
    fetchPyramids(me.profile.club_id),
  ]);

  type CodeRow = {
    code: string;
    role: string;
    max_uses: number;
    used_count: number;
    season_id: string | null;
    pyramid: { name: string } | null;
  };
  const codeRows = (codes as CodeRow[] | null) ?? [];

  const players = members.filter((m) => m.role === "player");
  const coaches = members.filter((m) => m.role === "coach");

  const pyramidById = Object.fromEntries(pyramids.map((p) => [p.id, p]));

  return (
    <main className="mx-auto max-w-md px-0 pb-28">
      <PageHeader title="Verwaltung" subtitle={club?.name ?? "Verein"} />

      <section className="px-5 space-y-3">
        <Card>
          <CardBody className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Spieler:innen" value={players.length} />
            <Stat label="Pyramiden" value={pyramids.length} />
            <Stat label="Disputes" value={(disputes ?? []).length} />
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-display text-lg">Pyramiden</h2>
            {pyramids.length === 0 ? (
              <p className="text-sm text-muted">Noch keine Pyramide. Lege jetzt eine an.</p>
            ) : (
              <ul className="space-y-1">
                {pyramids.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-pill bg-sand-50 dark:bg-court-800/30 px-3 py-2"
                  >
                    <span className="font-medium text-sm">{p.name}</span>
                    <Badge variant="court">{p.player_count} Spieler:innen</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-1">
              <p className="text-xs text-muted mb-2">Neue Pyramide anlegen</p>
              <NewSeasonForm />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-display text-lg">Einladungscodes</h2>
            <GenerateCodes pyramids={pyramids} />
            <CodeList codes={codeRows} />
          </CardBody>
        </Card>

        {(disputes ?? []).length > 0 && (
          <Card>
            <CardBody className="space-y-2">
              <h2 className="font-display text-lg">Streitfälle</h2>
              {(
                disputes as unknown as Array<{
                  id: string;
                  sets: { p1: number; p2: number }[];
                  dispute_reason: string | null;
                  winner: { nickname: string; avatar_seed: string };
                  loser: { nickname: string; avatar_seed: string };
                }>
              ).map((d) => (
                <div key={d.id} className="rounded-card border border-clay/40 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar seed={d.winner.avatar_seed} size={28} />
                    <span className="font-medium">{d.winner.nickname}</span>
                    <span className="text-muted">vs</span>
                    <Avatar seed={d.loser.avatar_seed} size={28} />
                    <span className="font-medium">{d.loser.nickname}</span>
                  </div>
                  <div className="font-mono text-sm">
                    {d.sets.map((s) => `${s.p1}:${s.p2}`).join(" · ")}
                  </div>
                  {d.dispute_reason && (
                    <div className="text-xs italic text-muted">„{d.dispute_reason}"</div>
                  )}
                  <DisputeActions matchId={d.id} />
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {coaches.length > 0 && (
          <Card>
            <CardBody className="space-y-2">
              <h2 className="font-display text-lg">Trainer:innen</h2>
              <p className="text-xs text-muted">Nehmen nicht an der Pyramide teil.</p>
              <ul className="divide-y divide-border">
                {coaches.map((m) => (
                  <li key={m.id} className="py-2 flex items-center gap-2">
                    <Avatar seed={m.avatar_seed} size={32} />
                    <span className="flex-1 text-sm font-medium">{m.nickname}</span>
                    <Badge variant="court">Trainer</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-2">
            <h2 className="font-display text-lg">Spieler:innen</h2>
            <p className="text-xs text-muted">
              Du kannst Mitspieler:innen Admin-Rechte geben. Admins können Codes erstellen, Saisons
              starten und Disputes lösen.
            </p>
            <ul className="divide-y divide-border">
              {players.map((m) => {
                const pyramid = m.season_id ? pyramidById[m.season_id] : null;
                return (
                  <li key={m.id} className="py-2 flex items-center gap-2">
                    <Avatar seed={m.avatar_seed} size={32} />
                    <Link href={`/profile/${m.id}`} className="flex-1 text-sm font-medium hover:underline">
                      {m.nickname}
                    </Link>
                    {pyramid && <Badge variant="muted">{pyramid.name}</Badge>}
                    {m.is_admin && <Badge variant="lemon">Admin</Badge>}
                    <AdminToggle profileId={m.id} isAdmin={m.is_admin} disabled={m.id === me.profile.id} />
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </section>
      <TabBar role="coach" />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-display text-2xl">{value}</div>
      <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}
