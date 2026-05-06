import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchMyLadderPosition, requirePlayer } from "@/lib/data";
import { progressToNextLevel } from "@/lib/achievements";

export default async function MePage() {
  const me = await requirePlayer();
  if (!me.profile) redirect("/onboard");
  const lvl = progressToNextLevel(me.profile.total_xp);

  const pos = me.activeSeason
    ? await fetchMyLadderPosition(me.profile.id, me.activeSeason.id)
    : null;
  const daysOnTop = pos
    ? pos.days_on_top +
      (pos.top_since
        ? Math.max(0, Math.floor((Date.now() - new Date(pos.top_since).getTime()) / 86_400_000))
        : 0)
    : 0;

  return (
    <main>
      <PageHeader title="Ich" />
      <section className="px-5 space-y-3">
        <Link href={`/profile/${me.profile.id}`}>
          <Card>
            <CardBody className="flex items-center gap-4">
              <Avatar seed={me.profile.avatar_seed} size={64} ring />
              <div className="flex-1">
                <div className="font-display text-xl">{me.profile.nickname}</div>
                <div className="text-xs text-muted">Lvl {lvl.level} · {me.profile.total_xp} XP</div>
                {daysOnTop > 0 && (
                  <div className="text-xs text-lemon-600 font-medium mt-0.5">
                    👑 {daysOnTop} {daysOnTop === 1 ? "Tag" : "Tage"} an der Spitze
                  </div>
                )}
              </div>
              <Badge variant="court">Profil →</Badge>
            </CardBody>
          </Card>
        </Link>

        <Card>
          <CardBody className="space-y-2 text-sm">
            <div className="font-medium">Datenschutz</div>
            <div className="text-muted text-xs">
              Wir speichern keine Klarnamen, Geburtsdaten oder E-Mails von Spielern. Du bist nur unter deinem Nickname
              sichtbar.
            </div>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link href="/me/settings" className="text-court-600 underline text-sm">
                Einstellungen
              </Link>
              <Link href="/api/account/export" className="text-court-600 underline text-sm">
                Daten exportieren
              </Link>
            </div>
          </CardBody>
        </Card>

        {(me.profile.role === "coach" || me.profile.is_admin) && (
          <Link href="/coach">
            <Card>
              <CardBody className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Verwaltung</div>
                  <div className="text-xs text-muted">Codes, Mitglieder, Disputes</div>
                </div>
                <Badge variant="lemon">→</Badge>
              </CardBody>
            </Card>
          </Link>
        )}
      </section>
    </main>
  );
}
