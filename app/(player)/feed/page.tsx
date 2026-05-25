import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  fetchMatchesNeedingMyAction,
  fetchRecentChallengeEvents,
  fetchRecentMatches,
  requireMe,
  type ChallengeFeedItem,
  type MatchWithProfiles,
} from "@/lib/data";
import { progressToNextLevel } from "@/lib/achievements";
import { formatRelative } from "@/lib/utils";
import { NickEgg } from "./nick-egg";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type FeedItem =
  | { kind: "match"; data: MatchWithProfiles; ts: string }
  | { kind: "challenge"; data: ChallengeFeedItem; ts: string };

export default async function FeedPage() {
  const me = await requireMe();
  const isPlayer = me.profile.role === "player";
  const [recent, challenges, pendingMine] = await Promise.all([
    fetchRecentMatches(me.profile.club_id, 25),
    fetchRecentChallengeEvents(me.profile.club_id, 20),
    isPlayer ? fetchMatchesNeedingMyAction(me.profile.id) : Promise.resolve([]),
  ]);
  const lvl = isPlayer ? progressToNextLevel(me.profile.total_xp) : null;

  const feedItems: FeedItem[] = [
    ...recent.map((m) => ({ kind: "match" as const, data: m, ts: m.played_at })),
    ...challenges.map((c) => ({
      kind: "challenge" as const,
      data: c,
      ts: c.status === "accepted" ? (c.responded_at ?? c.created_at) : c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 30);

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
        {feedItems.length === 0 ? (
          <Card>
            <CardBody className="text-sm text-muted text-center py-6">
              Noch keine Aktivität. Sei der Erste! 🎾
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {feedItems.map((item) =>
              item.kind === "match" ? (
                <FeedMatch key={`m-${item.data.id}`} match={item.data} />
              ) : (
                <FeedChallenge key={`c-${item.data.id}`} challenge={item.data} />
              ),
            )}
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

function FeedChallenge({ challenge: c }: { challenge: ChallengeFeedItem }) {
  const matchDate = c.counter_proposed_at ?? c.proposed_at;

  if (c.status === "accepted") {
    return (
      <Card className="border-court-200 dark:border-court-700">
        <CardBody className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            <Avatar seed={c.challenger.avatar_seed} size={40} ring />
            <Avatar seed={c.opponent.avatar_seed} size={40} ring />
          </div>
          <div className="flex-1 min-w-0 text-sm">
            <div>
              <Link href={`/profile/${c.challenger.id}`} className="font-semibold hover:underline">
                {c.challenger.nickname}
              </Link>{" "}
              <span className="text-muted">vs</span>{" "}
              <Link href={`/profile/${c.opponent.id}`} className="font-semibold hover:underline">
                {c.opponent.nickname}
              </Link>
            </div>
            {matchDate ? (
              <div className="text-xs text-court-700 dark:text-court-300 font-medium mt-0.5">
                Match am {formatDate(matchDate)}
              </div>
            ) : (
              <div className="text-xs text-muted mt-0.5">Termin noch offen</div>
            )}
            <div className="text-[11px] text-muted mt-0.5">{formatRelative(c.responded_at ?? c.created_at)}</div>
          </div>
          <Badge variant="court">Match geplant</Badge>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="opacity-80">
      <CardBody className="flex items-center gap-3">
        <div className="flex items-center -space-x-2">
          <Avatar seed={c.challenger.avatar_seed} size={40} ring />
          <Avatar seed={c.opponent.avatar_seed} size={32} />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div>
            <Link href={`/profile/${c.challenger.id}`} className="font-semibold hover:underline">
              {c.challenger.nickname}
            </Link>{" "}
            <span className="text-muted">fordert</span>{" "}
            <Link href={`/profile/${c.opponent.id}`} className="font-medium hover:underline">
              {c.opponent.nickname}
            </Link>{" "}
            <span className="text-muted">heraus</span>
          </div>
          {c.proposed_at && (
            <div className="text-xs text-muted mt-0.5">Vorschlag: {formatDate(c.proposed_at)}</div>
          )}
          <div className="text-[11px] text-muted mt-0.5">{formatRelative(c.created_at)}</div>
        </div>
        <Badge variant="muted">{c.status === "countered" ? "Gegenvorschlag" : "Offen"}</Badge>
      </CardBody>
    </Card>
  );
}
