import { z } from "zod";

export const onboardSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Code zu kurz")
    .max(64, "Code zu lang"),
  nickname: z
    .string()
    .trim()
    .min(3, "Mindestens 3 Zeichen")
    .max(16, "Höchstens 16 Zeichen")
    .regex(/^[A-Za-z0-9_\-]+$/, "Nur Buchstaben, Zahlen, _ und -"),
  initials: z
    .string()
    .trim()
    .max(3, "Höchstens 3 Buchstaben")
    .regex(/^[A-Za-z]*$/, "Nur Buchstaben")
    .optional(),
  ageGroup: z.enum(["U12", "U14", "U16", "U18", "open"]).optional(),
});

export type OnboardInput = z.infer<typeof onboardSchema>;

export const challengeSchema = z.object({
  opponentId: z.string().uuid(),
  proposedAt: z.string().optional(),
  message: z.string().max(280).optional(),
});

export type ChallengeInput = z.infer<typeof challengeSchema>;

const setSchema = z.object({
  p1: z.number().int().min(0).max(7),
  p2: z.number().int().min(0).max(7),
});

export const matchEntrySchema = z.object({
  challengeId: z.string().uuid().optional(),
  opponentId: z.string().uuid(),
  iWon: z.boolean(),
  format: z.enum(["best_of_3", "pro_set", "tiebreak_only"]),
  sets: z.array(setSchema).min(1).max(3),
});

export type MatchEntryInput = z.infer<typeof matchEntrySchema>;
