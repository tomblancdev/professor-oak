/**
 * Badge Templates
 *
 * Badge definitions for each level.
 */

import type { Level } from "./constants.js";

export interface BadgeTemplate {
  name: string;
  level: Level;
  gymLeader: string;
  points: number;
  description: string;
  colors: {
    primary: string;
    secondary: string;
  };
}

export const BADGE_TEMPLATES: Record<Level, BadgeTemplate> = {
  starter: {
    name: "Boulder Badge",
    level: "starter",
    gymLeader: "Brock",
    points: 500,
    description: "Proves mastery of the fundamentals",
    colors: {
      primary: "#8B4513",
      secondary: "#D2691E",
    },
  },
  beginner: {
    name: "Cascade Badge",
    level: "beginner",
    gymLeader: "Misty",
    points: 500,
    description: "Shows fluid understanding of basics",
    colors: {
      primary: "#1E90FF",
      secondary: "#00CED1",
    },
  },
  advanced: {
    name: "Thunder Badge",
    level: "advanced",
    gymLeader: "Lt. Surge",
    points: 500,
    description: "Demonstrates electrifying advanced knowledge",
    colors: {
      primary: "#FFD700",
      secondary: "#FFA500",
    },
  },
  expert: {
    name: "Marsh Badge",
    level: "expert",
    gymLeader: "Sabrina",
    points: 500,
    description: "Certifies true mastery and expertise",
    colors: {
      primary: "#9932CC",
      secondary: "#DA70D6",
    },
  },
};

/**
 * Get badge template for a level
 */
export function getBadgeTemplate(level: Level): BadgeTemplate {
  return BADGE_TEMPLATES[level];
}
