import { describe, expect, it } from "vitest";
import { canChallenge, groupByRow, nextBottomSlot, swapSlots } from "@/lib/ladder";

describe("nextBottomSlot", () => {
  it("first slot is row 1, col 1", () => {
    expect(nextBottomSlot([])).toEqual({ row: 1, col: 1 });
  });

  it("fills row 2 after row 1 is full", () => {
    expect(nextBottomSlot([{ row: 1, col: 1 }])).toEqual({ row: 2, col: 1 });
  });

  it("fills col 2 of row 2 next", () => {
    expect(nextBottomSlot([{ row: 1, col: 1 }, { row: 2, col: 1 }])).toEqual({ row: 2, col: 2 });
  });

  it("starts new row 3 once row 2 is full", () => {
    const filled = [
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ];
    expect(nextBottomSlot(filled)).toEqual({ row: 3, col: 1 });
  });
});

describe("canChallenge", () => {
  it("allows same row challenge", () => {
    expect(canChallenge({ row: 3, col: 1 }, { row: 3, col: 2 })).toBe(true);
  });

  it("allows challenging exactly one row above", () => {
    expect(canChallenge({ row: 3, col: 1 }, { row: 2, col: 2 })).toBe(true);
  });

  it("forbids challenging two rows above", () => {
    expect(canChallenge({ row: 4, col: 1 }, { row: 2, col: 1 })).toBe(false);
  });

  it("forbids challenging downward", () => {
    expect(canChallenge({ row: 2, col: 1 }, { row: 3, col: 1 })).toBe(false);
  });

  it("forbids self-challenge", () => {
    expect(canChallenge({ row: 2, col: 1 }, { row: 2, col: 1 })).toBe(false);
  });

  it("forbids when either player has no slot (e.g. coach)", () => {
    expect(canChallenge(null, { row: 1, col: 1 })).toBe(false);
    expect(canChallenge({ row: 1, col: 1 }, null)).toBe(false);
  });
});

describe("swapSlots", () => {
  it("swaps positions on climb", () => {
    const winner = { row: 3, col: 2 };
    const loser = { row: 2, col: 1 };
    const out = swapSlots(winner, loser);
    expect(out.winner).toEqual({ row: 2, col: 1 });
    expect(out.loser).toEqual({ row: 3, col: 2 });
  });
});

describe("groupByRow", () => {
  it("groups and sorts by row asc, col asc", () => {
    const players = [
      { row: 2, col: 2, id: "b" },
      { row: 1, col: 1, id: "top" },
      { row: 2, col: 1, id: "a" },
    ];
    const rows = groupByRow(players);
    expect(rows).toHaveLength(2);
    expect(rows[0].map((p) => p.id)).toEqual(["top"]);
    expect(rows[1].map((p) => p.id)).toEqual(["a", "b"]);
  });
});
