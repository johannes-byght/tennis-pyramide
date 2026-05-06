import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ACHIEVEMENTS, progressToNextLevel } from "@/lib/achievements";
import { canChallenge } from "@/lib/ladder";
import { fetchHeadToHead, fetchMyLadderPosition, fetchProfileWithStats, requireMe } from "@/lib/data";

export default async function ProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const me = await requireMe();
  if (!me.activeSeason) return notFound();
  const { profile, position, achievements } = await fetchProfileWithStats(id, me.activeSeason.id);
  if (!profile) return notFound();

  const isMe = id === me.profile.id;
  const h2h = isMe ? null : await fetchHeadToHead(me.profile.id, id);
  const lvl = progressToNextLevel(profile.total_xp);

  const isCoach = profile.role === "coach";
  const myPos = !isMe && me.profile.role === "player" ? await fetchMyLadderPosition(me.profile.id, me.activeSeason.id) : null;

  const daysOnTop = position
    ? position.days_on_top +
      (position.top_since
        ? Math.max(0, Math.floor((Date.now() - new Date(position.top_since).getTime()) / 86_400_000))
        : 0)
    : 0;
  const allowedToChallenge = !isMe && !isCoach && canChallenge(myPos, position);

  return (
    <main>
      <PageHeader
        title={profile.nickname}
        subtitle={profile.initials ? `„${profile.initials}"` : undefined}
      />
      <section className="px-5 space-y-3">
        <Card>
          <CardBody className="flex items-center gap-4">
            <Avatar seed={profile.avatar_seed} size={72} ring />
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-2xl">Lvl {lvl.level}</span>
                {isCoach ? (
                  <Badge variant="muted">Trainer:in</Badge>
                ) : position ? (
                  <Badge variant="court">Reihe {position.row} · #{position.col}</Badge>
                ) : (
                  <Badge variant="muted">keine Position</Badge>
                )}
                {profile.is_admin && !isCoach && <Badge variant="lemon">Admin</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted">
                {position?.matches_played ?? 0} Matches · {position?.wins ?? 0}S {position?.losses ?? 0}N
              </div>
              {(position?.row === 1 || daysOnTop > 0) && (
                <div className="mt-0.5 text-xs text-lemon-600 font-medium">
                  👑 {daysOnTop === 0
                    ? "heute an der Spitze"
                    : `${daysOnTop} ${daysOnTop === 1 ? "Tag" : "Tage"} an der Spitze`}
                </div>
              )}
              <div className="mt-2 h-1.5 bg-border rounded-pill overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-court-500 to-lemon-400"
                  style={{ width: `${Math.round(lvl.pct * 100)}%` }}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {!isMe && !isCoach && h2h && (
          <Card>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted">Head-to-Head</div>
                <div className="font-display text-2xl">
                  {h2h.myWins} : {h2h.theirWins}
                </div>
              </div>
              {allowedToChallenge ? (
                <Link href={`/challenges/new?opponent=${profile.id}`}>
                  <Button>Herausfordern</Button>
                </Link>
              ) : (
                <span className="text-xs text-muted text-right max-w-[10rem]">
                  Nicht herausforderbar (zu weit weg in der Pyramide)
                </span>
              )}
            </CardBody>
          </Card>
        )}

        {!isCoach && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg">Achievements</h2>
                <span className="text-xs text-muted">
                  {achievements.length} / {Object.keys(ACHIEVEMENTS).length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Object.values(ACHIEVEMENTS).map((a) => {
                  const earned = achievements.some((x) => x.achievement_code === a.code);
                  return (
                    <div
                      key={a.code}
                      className={`flex flex-col items-center gap-1 p-2 rounded-card border ${
                        earned ? "border-court-300 bg-court-50 dark:bg-court-800/30" : "border-border opacity-40"
                      }`}
                      title={a.description}
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-[10px] text-center leading-tight">{a.title}</span>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {position && position.current_streak >= 2 && (
          <Card>
            <CardBody className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div className="flex-1">
                <div className="font-medium">{position.current_streak} in Folge</div>
                <div className="text-xs text-muted">Best ever: {position.best_streak}</div>
              </div>
            </CardBody>
          </Card>
        )}
      </section>
    </main>
  );
}
