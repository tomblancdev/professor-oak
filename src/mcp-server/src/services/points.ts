/**
 * Points Service
 *
 * Points calculation and rank management.
 */

import { POINTS, TRAINER_RANKS } from "../config/constants.js";

/**
 * Calculate points for an action
 */
export function calculatePoints(
  action: keyof typeof POINTS,
  multiplier: number = 1
): number {
  return Math.round(POINTS[action] * multiplier);
}

/**
 * Calculate rank based on total points
 */
export function calculateRank(points: number): string {
  for (let i = TRAINER_RANKS.length - 1; i >= 0; i--) {
    if (points >= TRAINER_RANKS[i].minPoints) {
      return TRAINER_RANKS[i].name;
    }
  }
  return TRAINER_RANKS[0].name;
}

/**
 * Get points needed for next rank
 */
export function pointsToNextRank(currentPoints: number): { rank: string; points: number } | null {
  for (const rank of TRAINER_RANKS) {
    if (currentPoints < rank.minPoints) {
      return {
        rank: rank.name,
        points: rank.minPoints - currentPoints
      };
    }
  }
  return null; // Already at max rank
}
