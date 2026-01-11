/**
 * Persona Definitions
 *
 * Persona names and file paths for system prompt loading.
 */

import type { Level } from "./constants.js";

export interface PersonaDefinition {
  displayName: string;
  file: string | null;
  description: string;
}

export const PERSONAS: Record<string, PersonaDefinition> = {
  "professor-oak": {
    displayName: "Professor Oak",
    file: "professor-oak.md",
    description: "Wise mentor who guides learning journeys",
  },
  "nurse-joy": {
    displayName: "Nurse Joy",
    file: "nurse-joy.md",
    description: "Caring assistant who tracks progress",
  },
  "wild-encounter": {
    displayName: "Wild Encounter",
    file: "wild-encounter.md",
    description: "Dramatic narrator for random challenges",
  },
  "gym-leader": {
    displayName: "Gym Leader",
    file: null, // Selected by level
    description: "Quiz administrators by level",
  },
};

export const GYM_LEADER_FILES: Record<Level, string> = {
  starter: "gym-leaders/brock.md",
  beginner: "gym-leaders/misty.md",
  advanced: "gym-leaders/lt-surge.md",
  expert: "gym-leaders/sabrina.md",
};

export const GYM_LEADER_NAMES: Record<Level, string> = {
  starter: "Brock",
  beginner: "Misty",
  advanced: "Lt. Surge",
  expert: "Sabrina",
};

/**
 * Get persona definition by name or level
 */
export function getPersonaDefinition(
  name: string,
  level?: Level
): PersonaDefinition | null {
  if (name === "gym-leader") {
    if (!level) {
      return null;
    }
    const file = GYM_LEADER_FILES[level];
    const displayName = GYM_LEADER_NAMES[level];
    if (!file || !displayName) {
      return null;
    }
    return {
      displayName,
      file,
      description: `${displayName} - ${level} level gym leader`,
    };
  }
  return PERSONAS[name] || null;
}
