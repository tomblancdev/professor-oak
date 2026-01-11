/**
 * Game Constants
 *
 * All point values, tier configurations, and static game data.
 */

// Valid levels in order
export const LEVELS = ["starter", "beginner", "advanced", "expert"] as const;
export type Level = typeof LEVELS[number];

// Point values
export const POINTS = {
  COURSE_COMPLETE: 25,
  EXERCISE_OPTIONAL: 15,
  EXERCISE_MANDATORY: 30,
  EXTRA_LEARNING: 15,
  EXTRA_WITH_QUIZ: 30,
  BADGE_EARNED: 500,
  LEVEL_COMPLETE: 200,
  POKEMON_EVOLVED: 100,
  FIRST_LEGENDARY: 500,
  LEGENDARY_PERFECT: 200,
  LEGENDARY_COLLECTION_5: 1000,
} as const;

// Quiz tiers
export const QUIZ_TIERS = {
  1: { questions: 3, passRate: 0.66, base: 15, catchBonus: 25, perCorrect: 3 },
  2: { questions: 4, passRate: 0.75, base: 25, catchBonus: 35, perCorrect: 4 },
  3: { questions: 5, passRate: 0.80, base: 35, catchBonus: 50, perCorrect: 5 },
  4: { questions: 6, passRate: 0.83, base: 50, catchBonus: 75, perCorrect: 6 },
  5: { questions: 8, passRate: 0.87, base: 100, catchBonus: 150, perCorrect: 10 },
} as const;

// Level to tier mapping
export const LEVEL_TIERS: Record<Level, [number, number]> = {
  starter: [1, 2],
  beginner: [2, 3],
  advanced: [3, 4],
  expert: [4, 5],
};

// Pokemon complexity tiers (base stat total ranges)
export const POKEMON_TIERS = {
  1: { min: 0, max: 300, name: "Easy" },
  2: { min: 300, max: 400, name: "Medium" },
  3: { min: 400, max: 500, name: "Hard" },
  4: { min: 500, max: 600, name: "Expert" },
  5: { min: 600, max: 999, name: "Legendary" },
} as const;

// Trainer ranks
export const TRAINER_RANKS = [
  { name: "Rookie Trainer", minPoints: 0 },
  { name: "Pokemon Trainer", minPoints: 500 },
  { name: "Great Trainer", minPoints: 2000 },
  { name: "Expert Trainer", minPoints: 5000 },
  { name: "Pokemon Master", minPoints: 10000 },
] as const;

// Gym leaders per level
export const GYM_LEADERS: Record<Level, { name: string; badge: string }> = {
  starter: { name: "Brock", badge: "Boulder Badge" },
  beginner: { name: "Misty", badge: "Cascade Badge" },
  advanced: { name: "Lt. Surge", badge: "Thunder Badge" },
  expert: { name: "Sabrina", badge: "Marsh Badge" },
};

// Validation helpers
export function isValidKebabCase(str: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

export function isValidLevel(level: string): level is Level {
  return LEVELS.includes(level as Level);
}
