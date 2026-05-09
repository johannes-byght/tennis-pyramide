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

export function isValidTiebreak(set: SetScore): boolean {
  const { p1, p2 } = set;
  if (!Number.isInteger(p1) || !Number.isInteger(p2)) return false;
  if (p1 < 0 || p2 < 0) return false;
  const max = Math.max(p1, p2);
  const diff = Math.abs(p1 - p2);
  return max >= 10 && diff >= 2;
}

export function setWinner(set: SetScore): "p1" | "p2" | null {
  if (!isValidSet(set)) return null;
  return set.p1 > set.p2 ? "p1" : "p2";
}

export function determineWinner(sets: SetScore[], format: MatchFormat): "p1" | "p2" | null {
  if (!sets.length) return null;

  if (format === "best_of_3") {
    if (sets.length < 2 || sets.length > 3) return null;
    const [s1, s2, s3] = sets;
    if (!isValidSet(s1) || !isValidSet(s2)) return null;
    const w1 = setWinner(s1);
    const w2 = setWinner(s2);
    if (!w1 || !w2) return null;
    if (w1 === w2) return w1;
    if (!s3 || !isValidTiebreak(s3)) return null;
    return s3.p1 > s3.p2 ? "p1" : "p2";
  }

  if (format === "pro_set") {
    if (sets.length !== 1) return null;
    if (!isValidSet(sets[0])) return null;
    return setWinner(sets[0]);
  }

  // tiebreak_only: legacy single tiebreak
  if (sets.length !== 1) return null;
  if (!isValidTiebreak(sets[0])) return null;
  return sets[0].p1 > sets[0].p2 ? "p1" : "p2";
}

export function loserLostFirstSet(sets: SetScore[], winner: "p1" | "p2"): boolean {
  const first = sets[0];
  if (!first) return false;
  const w = setWinner(first);
  return w !== null && w !== winner;
}
