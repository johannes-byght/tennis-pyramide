import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requirePlayer } from "@/lib/data";
import { DangerZone } from "./danger-zone";

export default async function SettingsPage() {
  const me = await requirePlayer();
  return (
    <main>
      <PageHeader title="Einstellungen" subtitle={me.profile.nickname} />
      <section className="px-5 space-y-3">
        <Card>
          <CardBody className="text-sm space-y-1">
            <div className="font-medium">Was wir speichern</div>
            <ul className="text-xs text-muted list-disc pl-4 space-y-0.5">
              <li>Nickname & Initialen (von dir gewählt)</li>
              <li>Match-Ergebnisse, Elo, XP, Achievements</li>
              <li>Vereinszugehörigkeit & Rolle</li>
            </ul>
            <div className="font-medium pt-3">Was wir nicht speichern</div>
            <ul className="text-xs text-muted list-disc pl-4 space-y-0.5">
              <li>Klarnamen, Geburtsdatum, Adresse</li>
              <li>E-Mail (außer für Trainer-Accounts)</li>
              <li>Drittanbieter-Tracking, Werbung, Standort</li>
            </ul>
          </CardBody>
        </Card>

        <DangerZone />
      </section>
    </main>
  );
}
