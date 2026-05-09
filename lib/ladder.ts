// Pyramide / Ladder — pure Logik, gut testbar.
//
// Reihen-Geometrie:
//   Reihe 1 (Spitze) hat 1 Platz; Reihe N hat N Plätze.
//   row beginnt bei 1, col beginnt bei 1.

export type Slot = { row: number; col: number };

/** Bestimmt den nächsten freien Platz unten in der Pyramide. */
export function nextBottomSlot(filled: Slot[]): Slot {
  if (filled.length === 0) return { row: 1, col: 1 };
  const maxRow = filled.reduce((m, s) => Math.max(m, s.row), 0);
  const inMaxRow = filled.filter((s) => s.row === maxRow).length;
  if (inMaxRow < maxRow) return { row: maxRow, col: inMaxRow + 1 };
  return { row: maxRow + 1, col: 1 };
}

/**
 * Darf `challenger` `opponent` herausfordern?
 * Erlaubt: gleiche Reihe ODER eine Reihe darüber (= row-1 des Gegners).
 * Coaches haben gar keinen Slot → sind hier nicht spielberechtigt.
 */
export function canChallenge(challenger: Slot | null, opponent: Slot | null): boolean {
  if (!challenger || !opponent) return false;
  if (challenger.row === opponent.row && challenger.col === opponent.col) return false;
  return challenger.row === opponent.row || challenger.row === opponent.row + 1;
}

/**
 * Sind zwei Spieler ein gültiges Match-Paar?
 * Richtungsunabhängig: einer hätte den anderen herausfordern dürfen.
 * Wird beim Eintragen verwendet, weil der Eintragender nicht immer der
 * ursprüngliche Challenger ist.
 */
export function isValidMatchup(a: Slot | null, b: Slot | null): boolean {
  return canChallenge(a, b) || canChallenge(b, a);
}

/** Tauscht die Slots im Falle eines Aufstiegs. Annahme: winner war in row+1 des Verlierers. */
export function swapSlots(winner: Slot, loser: Slot): { winner: Slot; loser: Slot } {
  return { winner: { ...loser }, loser: { ...winner } };
}

/** Gruppiert eine Liste von Spielern (mit Slot) zeilenweise für die UI. */
export function groupByRow<T extends Slot>(items: T[]): T[][] {
  const rows = new Map<number, T[]>();
  for (const it of items) {
    const list = rows.get(it.row) ?? [];
    list.push(it);
    rows.set(it.row, list);
  }
  return [...rows.keys()]
    .sort((a, b) => a - b)
    .map((r) => (rows.get(r) ?? []).sort((a, b) => a.col - b.col));
}
