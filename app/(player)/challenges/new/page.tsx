import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { fetchLadder, fetchMyLadderPosition, requirePlayer } from "@/lib/data";
import { canChallenge } from "@/lib/ladder";
import { NewChallengeForm } from "./new-challenge-form";

export default async function NewChallengePage(props: {
  searchParams: Promise<{ opponent?: string; challenge?: string; mode?: string }>;
}) {
  const me = await requirePlayer();
  const params = await props.searchParams;

  if (!me.activeSeason) {
    return (
      <main className="px-5">
        <PageHeader title="Neue Challenge" subtitle="Aktuell läuft keine Saison." />
      </main>
    );
  }

  const [myPos, ladder] = await Promise.all([
    fetchMyLadderPosition(me.profile.id, me.activeSeason.id),
    fetchLadder(me.activeSeason.id),
  ]);

  if (!myPos) {
    return (
      <main className="px-5">
        <PageHeader title="Neue Challenge" subtitle="Du bist (noch) nicht in der Pyramide." />
        <Card>
          <CardBody className="text-sm text-muted">
            Sobald du in einer Saison platziert bist, kannst du andere herausfordern.
          </CardBody>
        </Card>
      </main>
    );
  }

  const challengeable = ladder.filter(
    (m) => m.profile_id !== me.profile.id && canChallenge(myPos, { row: m.row, col: m.col }),
  );

  // Beim Eintragen eines bereits bestehenden Match-Ergebnisses muss der Gegner
  // immer auswählbar sein — auch wenn er nicht (mehr) in der Reichweite liegt
  // (z. B. wenn die #1 ein Match gegen jemanden aus Reihe 2 einträgt).
  let members = challengeable;
  if (params.challenge && params.opponent) {
    const presetMember = ladder.find((m) => m.profile_id === params.opponent);
    if (presetMember && !members.some((m) => m.profile_id === presetMember.profile_id)) {
      members = [presetMember, ...members];
    }
  }

  return (
    <main>
      <PageHeader
        title={params.challenge ? "Ergebnis eintragen" : "Neue Challenge"}
        subtitle={`Du stehst in Reihe ${myPos.row} · #${myPos.col}`}
      />
      <section className="px-5">
        <NewChallengeForm
          members={members}
          presetOpponent={params.opponent}
          challengeId={params.challenge}
          presetMode={params.mode === "result" || params.challenge ? "result" : "challenge"}
          mySlot={{ row: myPos.row, col: myPos.col }}
          lockMode={Boolean(params.challenge)}
        />
      </section>
    </main>
  );
}
