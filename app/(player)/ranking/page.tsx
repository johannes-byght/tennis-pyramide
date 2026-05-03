import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchLadder, requireMe } from "@/lib/data";
import { groupByRow } from "@/lib/ladder";
import { cn } from "@/lib/utils";

export default async function RankingPage() {
  const me = await requireMe();
  if (!me.activeSeason) {
    return (
      <main className="px-5">
        <PageHeader title="Pyramide" subtitle="Aktuell läuft keine Saison." />
      </main>
    );
  }
  const ladder = await fetchLadder(me.activeSeason.id);
  const rows = groupByRow(ladder);

  return (
    <main>
      <PageHeader title="Pyramide" subtitle={me.activeSeason.name} />

      <section className="px-3 space-y-3">
        {rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            Noch keine Spieler:innen. Lade Mitglieder ein, dann geht's los.
          </Card>
        ) : (
          rows.map((row) => (
            <div key={row[0].row} className="flex items-stretch justify-center gap-2">
              {row.map((p) => {
                const isMe = p.profile_id === me.profile.id;
                const onTop = p.row === 1;
                return (
                  <Link
                    key={p.profile_id}
                    href={`/profile/${p.profile_id}`}
                    className="flex-1 max-w-[120px]"
                  >
                    <Card
                      className={cn(
                        "h-full px-2 py-3 flex flex-col items-center text-center gap-1",
                        isMe && "ring-2 ring-court-400 border-court-400",
                        onTop && "bg-gradient-to-b from-lemon-100/60 to-transparent",
                      )}
                    >
                      <div className="relative">
                        <Avatar seed={p.avatar_seed} size={44} ring={isMe} />
                        {onTop && (
                          <span
                            aria-label="Spitzenposition"
                            className="absolute -top-2 -right-2 text-base"
                          >
                            👑
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-xs truncate w-full" title={p.nickname}>
                        {p.nickname}
                      </div>
                      <div className="text-[10px] text-muted">
                        {p.wins}S · {p.losses}N
                        {p.current_streak >= 2 && (
                          <span className="ml-1 text-clay">🔥{p.current_streak}</span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </section>

      <section className="px-5 mt-6">
        <Card>
          <CardBody className="text-xs text-muted space-y-1">
            <p>
              <strong>So funktioniert die Pyramide:</strong> Du kannst Spieler:innen aus deiner
              eigenen Reihe oder genau einer Reihe darüber herausfordern.
            </p>
            <p>
              Gewinnst du gegen jemanden über dir, tauscht ihr die Plätze. Trainer:innen tauchen
              hier nicht auf.
            </p>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
