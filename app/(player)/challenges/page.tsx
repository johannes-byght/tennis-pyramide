import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchMatchesNeedingMyAction, fetchMyChallenges, requirePlayer } from "@/lib/data";
import { ChallengeActions } from "./challenge-actions";
import { formatRelative } from "@/lib/utils";

export default async function ChallengesPage() {
  const me = await requirePlayer();
  const [challenges, matches] = await Promise.all([
    fetchMyChallenges(me.profile.id),
    fetchMatchesNeedingMyAction(me.profile.id),
  ]);

  return (
    <main>
      <PageHeader
        title="Spielen"
        subtitle="Fordere jemanden heraus oder reagiere auf Anfragen."
        right={
          <Link
            href="/challenges/new"
            className="rounded-pill bg-court-600 text-white px-4 py-2 text-sm font-medium shadow-cozy hover:bg-court-700"
          >
            + Neu
          </Link>
        }
      />

      {matches.length > 0 && (
        <section className="px-5 mt-2">
          <h2 className="font-display text-lg mb-2">Bestätigung nötig</h2>
          <div className="space-y-2">
            {matches.map((m) => {
              const opp = m.winner_id === me.profile.id ? m.loser : m.winner;
              return (
                <Link href={`/challenges/${m.id}/confirm`} key={m.id}>
                  <Card className="border-lemon-400">
                    <CardBody className="flex items-center gap-3">
                      <Avatar seed={opp.avatar_seed} />
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="font-medium">{opp.nickname}</div>
                        <div className="text-xs text-muted">Match-Ergebnis prüfen</div>
                      </div>
                      <Badge variant="lemon">→</Badge>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-5 mt-5">
        <h2 className="font-display text-lg mb-2">Offene Challenges</h2>
        {challenges.length === 0 ? (
          <Card>
            <CardBody className="text-sm text-muted text-center py-6">
              Keine offenen Challenges. Schnapp dir jemanden!
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {challenges.map((c) => {
              const isIncoming = c.opponent.id === me.profile.id;
              const counterpart = isIncoming ? c.challenger : c.opponent;
              return (
                <Card key={c.id}>
                  <CardBody className="flex items-center gap-3">
                    <Avatar seed={counterpart.avatar_seed} />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-medium truncate">
                        {isIncoming ? `${counterpart.nickname} fordert dich heraus` : `Du forderst ${counterpart.nickname}`}
                      </div>
                      <div className="text-xs text-muted">
                        {c.status === "accepted" ? "angenommen · " : ""}
                        {formatRelative(c.created_at)}
                      </div>
                      {c.message && <p className="mt-1 text-xs italic line-clamp-2">„{c.message}"</p>}
                    </div>
                    <ChallengeActions
                      id={c.id}
                      status={c.status as "pending" | "accepted"}
                      isIncoming={isIncoming}
                      opponentId={counterpart.id}
                    />
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
