export type AchievementCode =
  | "first_match"
  | "ten_matches"
  | "first_win"
  | "ladder_climb"
  | "comeback_kid"
  | "hot_week"
  | "club_native"
  | "streak_3"
  | "streak_5"
  | "night_owl";

export type Achievement = {
  code: AchievementCode;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
};

export const ACHIEVEMENTS: Record<AchievementCode, Achievement> = {
  first_match: {
    code: "first_match",
    title: "Erstes Match",
    description: "Spiele dein erstes bestätigtes Match.",
    icon: "🎾",
    xpReward: 50,
  },
  ten_matches: {
    code: "ten_matches",
    title: "Stammspieler",
    description: "Spiele 10 bestätigte Matches.",
    icon: "🏟️",
    xpReward: 150,
  },
  first_win: {
    code: "first_win",
    title: "Erster Sieg",
    description: "Gewinne dein erstes Match.",
    icon: "🥇",
    xpReward: 100,
  },
  ladder_climb: {
    code: "ladder_climb",
    title: "Aufsteiger",
    description: "Schlage einen Spieler aus der Reihe über dir.",
    icon: "🪜",
    xpReward: 200,
  },
  comeback_kid: {
    code: "comeback_kid",
    title: "Comeback Kid",
    description: "Gewinne ein Match nach Satzrückstand.",
    icon: "🔥",
    xpReward: 150,
  },
  hot_week: {
    code: "hot_week",
    title: "Heiße Woche",
    description: "3 Matches in 7 Tagen.",
    icon: "☀️",
    xpReward: 100,
  },
  club_native: {
    code: "club_native",
    title: "Vereinstreu",
    description: "Spiele gegen 5 verschiedene Mitglieder.",
    icon: "🤝",
    xpReward: 150,
  },
  streak_3: {
    code: "streak_3",
    title: "Heiß gelaufen",
    description: "3 Siege in Folge.",
    icon: "⚡",
    xpReward: 150,
  },
  streak_5: {
    code: "streak_5",
    title: "Unaufhaltsam",
    description: "5 Siege in Folge.",
    icon: "💫",
    xpReward: 250,
  },
  night_owl: {
    code: "night_owl",
    title: "Nachtschwärmer",
    description: "Spiele ein Match nach 21 Uhr.",
    icon: "🌙",
    xpReward: 50,
  },
};

export const ACHIEVEMENT_LIST: Achievement[] = Object.values(ACHIEVEMENTS);

export function levelForXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 50)) + 1);
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50;
}

export function progressToNextLevel(totalXp: number): { level: number; have: number; need: number; pct: number } {
  const level = levelForXp(totalXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const have = totalXp - base;
  const need = next - base;
  return { level, have, need, pct: Math.min(1, have / need) };
}
