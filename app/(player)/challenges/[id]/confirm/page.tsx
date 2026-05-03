import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requirePlayer } from "@/lib/data";
import { ConfirmMatchButtons } from "./confirm-buttons";

export default async function ConfirmMatchPage(props: { params: Promise<{ id: string }> }) {
  const me = await requirePlayer();
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select(
      `*, winner:profiles!matches_winner_id_fkey(id, nickname, avatar_seed), loser:profiles!matches_loser_id_fkey(id, nickname, avatar_seed)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!match) {
    return (
      <main className="px-5">
        <PageHeader title="Match nicht gefunden" />
        <Link href="/feed" className="text-court-600 underline">
          Zurück zum Feed
        </Link>
      </main>
    );
  }

  type LinkedProfile = { id: string; nickname: string; avatar_seed: string };
  const m = match as unknown as {
    id: string;
    winner_id: string;
    loser_id: string;
    sets: { p1: number; p2: number }[];
    status: string;
    recorded_by: string;
    winner: LinkedProfile;
    loser: LinkedProfile;
  };
  const isParticipant = m.winner_id === me.profile.id || m.loser_id === me.profile.id;
  const canConfirm = isParticipant && m.status === "unconfirmed" && m.recorded_by !== me.profile.id;

  return (
    <main>
      <PageHeader title="Match prüfen" subtitle={canConfirm ? "Stimmt das Ergebnis?" : "Status"} />
      <section className="px-5 space-y-3">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <PlayerLine p={m.winner} winner />
              <span className="font-display text-2xl">vs</span>
              <PlayerLine p={m.loser} />
            </div>
            <div className="rounded-card bg-sand-50 dark:bg-court-800/30 px-4 py-3 text-center">
              <div className="text-xs uppercase tracking-wide text-muted mb-1">Ergebnis</div>
              <div className="font-mono text-2xl">
                {m.sets.map((s, i) => (
                  <span key={i} className="mx-1">
                    {s.p1}:{s.p2}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-muted text-center">
              Eingetragen von{" "}
              <span className="font-medium">
                {m.recorded_by === m.winner.id ? m.winner.nickname : m.loser.nickname}
              </span>
            </div>
          </CardBody>
        </Card>

        {canConfirm ? (
          <ConfirmMatchButtons matchId={m.id} />
        ) : (
          <Card>
            <CardBody className="text-sm text-muted text-center">
              {m.status === "confirmed"
                ? "Bereits bestätigt."
                : m.status === "disputed"
                  ? "Im Streitfall — Trainer entscheidet."
                  : "Warte auf Bestätigung."}
            </CardBody>
          </Card>
        )}
      </section>
    </main>
  );
}

function PlayerLine({ p, winner = false }: { p: { nickname: string; avatar_seed: string }; winner?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <Avatar seed={p.avatar_seed} size={56} ring={winner} />
      <div className="text-sm font-medium truncate max-w-full">{p.nickname}</div>
      {winner && <span className="text-xs text-lemon-500">Gewinner</span>}
    </div>
  );
}
