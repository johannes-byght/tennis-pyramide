"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { createChallenge, recordMatch } from "@/lib/actions/challenges";
import type { LadderRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Mode = "challenge" | "result";
type Format = "best_of_3" | "pro_set";

type Member = Pick<LadderRow, "profile_id" | "nickname" | "avatar_seed" | "level" | "row" | "col">;

const FORMAT_LABEL: Record<Format, string> = {
  best_of_3: "2 Sätze + CT",
  pro_set: "1 Satz",
};

function initialSets(format: Format): { p1: string; p2: string }[] {
  return format === "best_of_3"
    ? [{ p1: "", p2: "" }, { p1: "", p2: "" }]
    : [{ p1: "", p2: "" }];
}

export function NewChallengeForm({
  members,
  presetOpponent,
  challengeId,
  presetMode = "challenge",
  mySlot,
  lockMode = false,
}: {
  members: Member[];
  presetOpponent?: string;
  challengeId?: string;
  presetMode?: Mode;
  mySlot: { row: number; col: number };
  lockMode?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(presetMode);
  const [opponentId, setOpponentId] = useState<string | null>(presetOpponent ?? null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [proposedAt, setProposedAt] = useState("");

  // Result mode state
  const [iWon, setIWon] = useState(true);
  const [format, setFormat] = useState<Format>("best_of_3");
  const [sets, setSets] = useState<{ p1: string; p2: string }[]>(initialSets("best_of_3"));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    return members.filter((m) => m.nickname.toLowerCase().includes(search.toLowerCase()));
  }, [members, search]);

  const opponent = members.find((m) => m.profile_id === opponentId) ?? null;

  function changeFormat(f: Format) {
    setFormat(f);
    setSets(initialSets(f));
  }

  function updateSet(i: number, key: "p1" | "p2", value: string) {
    setSets(sets.map((s, idx) => (idx === i ? { ...s, [key]: value.replace(/[^0-9]/g, "").slice(0, 2) } : s)));
  }

  function addCT() {
    if (sets.length >= 3) return;
    setSets([...sets, { p1: "", p2: "" }]);
  }

  function removeCT() {
    setSets(sets.slice(0, 2));
  }

  const isCT = (i: number) => format === "best_of_3" && i === 2;

  return (
    <div className="space-y-3">
      {!lockMode && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === "challenge" ? "primary" : "secondary"}
            onClick={() => setMode("challenge")}
            type="button"
          >
            Herausfordern
          </Button>
          <Button
            variant={mode === "result" ? "primary" : "secondary"}
            onClick={() => setMode("result")}
            type="button"
          >
            Ergebnis eintragen
          </Button>
        </div>
      )}

      {!opponent ? (
        <Card>
          <CardBody className="space-y-3">
            <Input placeholder="Mitspieler suchen…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="max-h-72 overflow-auto -mx-1">
              {members.length === 0 && (
                <li className="text-sm text-muted text-center py-6">
                  Niemand in deiner Reichweite. Du kannst nur Reihe {mySlot.row} oder {Math.max(1, mySlot.row - 1)} fordern.
                </li>
              )}
              {members.length > 0 && filtered.length === 0 && (
                <li className="text-sm text-muted text-center py-6">Niemand gefunden.</li>
              )}
              {filtered.map((m) => {
                const aboveMe = m.row === mySlot.row - 1;
                return (
                  <li key={m.profile_id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-pill hover:bg-sand-100 dark:hover:bg-court-800/40 text-left"
                      onClick={() => setOpponentId(m.profile_id)}
                    >
                      <Avatar seed={m.avatar_seed} size={36} />
                      <div className="flex-1">
                        <div className="font-medium">{m.nickname}</div>
                        <div className="text-xs text-muted">
                          Reihe {m.row} · #{m.col}
                          {aboveMe && <span className="ml-1 text-clay">↑ über dir</span>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="flex items-center gap-3">
            <Avatar seed={opponent.avatar_seed} size={48} ring />
            <div className="flex-1">
              <div className="font-medium">{opponent.nickname}</div>
              <div className="text-xs text-muted">
                Reihe {opponent.row} · #{opponent.col}
                {opponent.row === mySlot.row - 1 && <span className="ml-1 text-clay">↑ über dir</span>}
              </div>
            </div>
            {!lockMode && (
              <Button variant="ghost" size="sm" type="button" onClick={() => setOpponentId(null)}>
                Wechseln
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {opponent && mode === "challenge" && (
        <Card>
          <CardBody className="space-y-4">
            <Field label="Wann passt's?">
              <Input type="datetime-local" value={proposedAt} onChange={(e) => setProposedAt(e.target.value)} />
            </Field>
            <Field label="Nachricht (optional)">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                placeholder="Lust auf einen Satz nach dem Training?"
              />
            </Field>
          </CardBody>
        </Card>
      )}

      {opponent && mode === "result" && (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-1.5">Wer hat gewonnen?</div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={iWon ? "primary" : "secondary"} onClick={() => setIWon(true)}>
                  Ich
                </Button>
                <Button type="button" variant={!iWon ? "primary" : "secondary"} onClick={() => setIWon(false)}>
                  {opponent.nickname}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1.5">Format</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(Object.keys(FORMAT_LABEL) as Format[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => changeFormat(f)}
                    className={cn(
                      "rounded-pill px-3 py-2 border transition",
                      format === f
                        ? "bg-court-600 text-white border-court-600"
                        : "bg-card border-border text-muted",
                    )}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-1.5">Ergebnis</div>
              <div className="space-y-2">
                {sets.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={cn("w-12 text-xs font-medium", isCT(i) ? "text-lemon-600" : "text-muted")}>
                      {isCT(i) ? "CT" : `Satz ${i + 1}`}
                    </span>
                    <Input
                      inputMode="numeric"
                      placeholder={isCT(i) ? "10" : "6"}
                      value={s.p1}
                      onChange={(e) => updateSet(i, "p1", e.target.value)}
                      className="text-center max-w-16"
                    />
                    <span className="text-muted">:</span>
                    <Input
                      inputMode="numeric"
                      placeholder={isCT(i) ? "7" : "4"}
                      value={s.p2}
                      onChange={(e) => updateSet(i, "p2", e.target.value)}
                      className="text-center max-w-16"
                    />
                    {isCT(i) && (
                      <Button variant="ghost" size="sm" type="button" onClick={removeCT}>
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                {format === "best_of_3" && sets.length === 2 && (
                  <Button variant="ghost" size="sm" type="button" onClick={addCT}>
                    + CT hinzufügen
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                Dein Ergebnis links, Gegner rechts.
                {format === "best_of_3" && " CT bei 1:1 Sätzen."}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {error && (
        <Card className="border-clay">
          <CardBody className="text-sm text-clay-dark">{error}</CardBody>
        </Card>
      )}

      {opponent && (
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              if (mode === "challenge") {
                const r = await createChallenge({
                  opponentId: opponent.profile_id,
                  proposedAt: proposedAt || undefined,
                  message: message || undefined,
                });
                if (!r.ok) return setError(r.error ?? "Fehler");
                router.push("/challenges");
                router.refresh();
                return;
              }
              const setsNum = sets
                .filter((s) => s.p1 !== "" && s.p2 !== "")
                .map((s) => ({ p1: parseInt(s.p1, 10), p2: parseInt(s.p2, 10) }));
              const r = await recordMatch({
                challengeId,
                opponentId: opponent.profile_id,
                iWon,
                format,
                sets: setsNum,
              });
              if (!r.ok) return setError(r.error ?? "Fehler");
              router.push("/feed");
              router.refresh();
            })
          }
        >
          {pending ? "Sende…" : mode === "challenge" ? "Challenge abschicken" : "Ergebnis eintragen"}
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}
