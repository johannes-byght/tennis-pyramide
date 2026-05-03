import { describe, expect, it } from "vitest";
import { determineWinner, isValidSet, loserLostFirstSet } from "@/lib/scoring";

describe("isValidSet", () => {
  it("accepts 6:4", () => expect(isValidSet({ p1: 6, p2: 4 })).toBe(true));
  it("accepts 7:5", () => expect(isValidSet({ p1: 7, p2: 5 })).toBe(true));
  it("accepts 7:6", () => expect(isValidSet({ p1: 7, p2: 6 })).toBe(true));
  it("rejects 6:5", () => expect(isValidSet({ p1: 6, p2: 5 })).toBe(false));
  it("rejects 8:6", () => expect(isValidSet({ p1: 8, p2: 6 })).toBe(false));
  it("rejects negatives", () => expect(isValidSet({ p1: -1, p2: 6 })).toBe(false));
  it("rejects non-integers", () => expect(isValidSet({ p1: 6.5, p2: 4 })).toBe(false));
});

describe("determineWinner", () => {
  it("best_of_3: 6:4 6:3 → p1", () => {
    expect(
      determineWinner(
        [
          { p1: 6, p2: 4 },
          { p1: 6, p2: 3 },
        ],
        "best_of_3",
      ),
    ).toBe("p1");
  });

  it("best_of_3: 4:6 6:3 7:5 → p1", () => {
    expect(
      determineWinner(
        [
          { p1: 4, p2: 6 },
          { p1: 6, p2: 3 },
          { p1: 7, p2: 5 },
        ],
        "best_of_3",
      ),
    ).toBe("p1");
  });

  it("best_of_3: 6:4 4:6 → null (incomplete)", () => {
    expect(
      determineWinner(
        [
          { p1: 6, p2: 4 },
          { p1: 4, p2: 6 },
        ],
        "best_of_3",
      ),
    ).toBe(null);
  });

  it("pro_set: single set decides", () => {
    expect(determineWinner([{ p1: 6, p2: 2 }], "pro_set")).toBe("p1");
  });

  it("rejects invalid sets", () => {
    expect(determineWinner([{ p1: 6, p2: 5 }], "pro_set")).toBe(null);
  });
});

describe("loserLostFirstSet", () => {
  it("winner lost first set → comeback", () => {
    expect(
      loserLostFirstSet(
        [
          { p1: 4, p2: 6 },
          { p1: 6, p2: 3 },
          { p1: 6, p2: 4 },
        ],
        "p1",
      ),
    ).toBe(true);
  });

  it("winner won first set → not a comeback", () => {
    expect(
      loserLostFirstSet(
        [
          { p1: 6, p2: 4 },
          { p1: 6, p2: 3 },
        ],
        "p1",
      ),
    ).toBe(false);
  });
});
