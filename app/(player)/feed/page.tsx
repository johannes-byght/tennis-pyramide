import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchMatchesNeedingMyAction, fetchRecentMatches, requireMe, type MatchWithProfiles } from "@/lib/data";
import { progressToNextLevel } from "@/lib/achievements";
import { formatRelative } from "@/lib/utils";
import { NickEgg } from "./nick-egg";

export default async function FeedPage() {
  const me = await requireMe();
  const isPlayer = me.profile.role === "player";
  const [recent, pendingMine] = await Promise.all([
    fetchRecentMatches(me.profile.club_id, 25),
    isPlayer ? fetchMatchesNeedingMyAction(me.profile.id) : Promise.resolve([]),
  ]);
  const lvl = isPlayer ? progressToNextLevel(me.profile.total_xp) : null;

  return (
    <main>
      <PageHeader
        title={`Hi ${me.profile.nickname}!`}
        subtitle={isPlayer ? "Heute ein Match?" : "Vereins-Feed"}
        right={
          isPlayer ? (
            <Link
              href="/challenges/new"
              className="rounded-pill bg-court-600 text-white px-4 py-2 text-sm font-medium shadow-cozy hover:bg-court-700"
            >
              + Challenge
            </Link>
          ) : undefined
        }
      />

      {isPlayer && lvl && (
        <section className="px-5">
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar seed={me.profile.avatar_seed} size={56} ring />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl">Lvl {lvl.level}</span>
                  <span className="text-xs text-muted">{me.profile.total_xp} XP</span>
                </div>
                <div className="mt-2 h-2 w-full bg-border rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-court-500 to-lemon-400 transition-all"
                    style={{ width: `${Math.round(lvl.pct * 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  Noch {lvl.need - lvl.have} XP bis Level {lvl.level + 1}
                </div>
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      {isPlayer && pendingMine.length > 0 && (
        <section className="px-5 mt-5">
          <h2 className="font-display text-lg mb-2">Bestätigung nötig</h2>
          <div className="space-y-2">
            {pendingMine.map((m) => (
              <Link key={m.id} href={`/challenges/${m.id}/confirm`}>
                <Card className="border-lemon-400">
                  <CardBody className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar seed={(m.winner_id === me.profile.id ? m.loser : m.winner).avatar_seed} />
                      <div className="text-sm">
                        <div className="font-medium">
                          {(m.winner_id === me.profile.id ? m.loser : m.winner).nickname}
                        </div>
                        <div className="text-xs text-muted">hat ein Ergebnis eingetragen</div>
                      </div>
                    </div>
                    <Badge variant="lemon">Prüfen →</Badge>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 mt-5">
        <h2 className="font-display text-lg mb-2">Vereins-Feed</h2>
        {recent.length === 0 ? (
          <Card>
            <CardBody className="text-sm text-muted text-center py-6">
              Noch keine Matches gespielt. Sei der Erste! 🎾
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {recent.map((m) => (
              <FeedMatch key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {isPlayer && <NickEgg />}
    </main>
  );
}

function FeedMatch({ match }: { match: MatchWithProfiles }) {
  const sets = match.sets.map((s) => `${s.p1}:${s.p2}`).join(" · ");
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <Avatar seed={match.winner.avatar_seed} size={44} ring />
          <Avatar seed={match.loser.avatar_seed} size={32} className="opacity-70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm">
            <Link href={`/profile/${match.winner.id}`} className="font-semibold hover:underline">
              {match.winner.nickname}
            </Link>{" "}
            <span className="text-muted">schlägt</span>{" "}
            <Link href={`/profile/${match.loser.id}`} className="font-medium hover:underline">
              {match.loser.nickname}
            </Link>
          </div>
          <div className="mt-1 font-mono text-base">{sets}</div>
          <div className="mt-1 text-[11px] text-muted">{formatRelative(match.played_at)}</div>
        </div>
        {match.position_swap && (
          <Badge variant="lemon" className="self-start" title="Aufstieg in der Pyramide">
            🪜 Aufstieg
          </Badge>
        )}
      </CardBody>
    </Card>
  );
}
