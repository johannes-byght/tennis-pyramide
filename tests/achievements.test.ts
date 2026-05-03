import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_LIST, levelForXp, progressToNextLevel, xpForLevel } from "@/lib/achievements";

describe("achievement catalog", () => {
  it("matches the SQL catalog by code", () => {
    const expected = [
      "first_match",
      "ten_matches",
      "first_win",
      "ladder_climb",
      "comeback_kid",
      "hot_week",
      "club_native",
      "streak_3",
      "streak_5",
      "night_owl",
    ];
    expect(ACHIEVEMENT_LIST.map((a) => a.code).sort()).toEqual(expected.sort());
  });

  it("every achievement has positive xp", () => {
    for (const a of Object.values(ACHIEVEMENTS)) {
      expect(a.xpReward).toBeGreaterThan(0);
    }
  });
});

describe("levelForXp", () => {
  it("level 1 at 0 xp", () => expect(levelForXp(0)).toBe(1));
  it("level 2 at 50 xp", () => expect(levelForXp(50)).toBe(2));
  it("level 3 at 200 xp", () => expect(levelForXp(200)).toBe(3));
  it("monotonic", () => {
    let prev = 1;
    for (let xp = 0; xp < 5000; xp += 50) {
      const lv = levelForXp(xp);
      expect(lv).toBeGreaterThanOrEqual(prev);
      prev = lv;
    }
  });
});

describe("progressToNextLevel", () => {
  it("reports a fractional progress", () => {
    const p = progressToNextLevel(75);
    expect(p.level).toBe(2);
    expect(p.have).toBeGreaterThanOrEqual(0);
    expect(p.need).toBeGreaterThan(0);
    expect(p.pct).toBeGreaterThan(0);
    expect(p.pct).toBeLessThanOrEqual(1);
  });

  it("xpForLevel inverses levelForXp at boundary", () => {
    for (let lv = 1; lv < 20; lv++) {
      const xp = xpForLevel(lv);
      expect(levelForXp(xp)).toBe(lv);
    }
  });
});
