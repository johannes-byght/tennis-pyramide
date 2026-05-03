export type SetScore = { p1: number; p2: number };
export type MatchFormat = "best_of_3" | "pro_set" | "tiebreak_only";

export function isValidSet(set: SetScore): boolean {
  const { p1, p2 } = set;
  if (!Number.isInteger(p1) || !Number.isInteger(p2)) return false;
  if (p1 < 0 || p2 < 0) return false;
  if (p1 > 7 || p2 > 7) return false;
  const max = Math.max(p1, p2);
  const min = Math.min(p1, p2);
  if (max < 6) return false;
  if (max === 6 && min <= 4) return true;
  if (max === 7 && (min === 5 || min === 6)) return true;
  return false;
}

export function setWinner(set: SetScore): "p1" | "p2" | null {
  if (!isValidSet(set)) return null;
  return set.p1 > set.p2 ? "p1" : "p2";
}

export function determineWinner(sets: SetScore[], format: MatchFormat): "p1" | "p2" | null {
  if (!sets.length) return null;
  if (!sets.every(isValidSet)) return null;
  let p1 = 0;
  let p2 = 0;
  for (const set of sets) {
    const w = setWinner(set);
    if (w === "p1") p1++;
    else if (w === "p2") p2++;
    else return null;
  }
  const needed = format === "best_of_3" ? 2 : 1;
  if (p1 >= needed && p1 > p2) return "p1";
  if (p2 >= needed && p2 > p1) return "p2";
  return null;
}

export function loserLostFirstSet(sets: SetScore[], winner: "p1" | "p2"): boolean {
  const first = sets[0];
  if (!first) return false;
  const w = setWinner(first);
  return w !== null && w !== winner;
}
