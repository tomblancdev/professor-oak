/**
 * Persona Definitions
 *
 * Persona names and file paths for system prompt loading.
 */

import type { Level } from "./constants.js";

export interface PersonaDefinition {
  name: string;
  file: string;
  description: string;
}

export const PERSONAS: Record<string, PersonaDefinition> = {
  "professor-oak": {
    name: "Professor Oak",
    file: "personas/professor-oak.md",
    description: "The learning guide and mentor",
  },
  "nurse-joy": {
    name: "Nurse Joy",
    file: "personas/nurse-joy.md",
    description: "Progress checker and encouragement",
  },
  "wild-encounter": {
    name: "Wild Encounter Narrator",
    file: "personas/wild-encounter.md",
    description: "Dramatic quiz narrator",
  },
};

export const GYM_LEADER_PERSONAS: Record<Level, PersonaDefinition> = {
  starter: {
    name: "Brock",
    file: "personas/gym-leaders/brock.md",
    description: "Starter level gym leader",
  },
  beginner: {
    name: "Misty",
    file: "personas/gym-leaders/misty.md",
    description: "Beginner level gym leader",
  },
  advanced: {
    name: "Lt. Surge",
    file: "personas/gym-leaders/lt-surge.md",
    description: "Advanced level gym leader",
  },
  expert: {
    name: "Sabrina",
    file: "personas/gym-leaders/sabrina.md",
    description: "Expert level gym leader",
  },
};

/**
 * Get persona definition by name or level
 */
export function getPersonaDefinition(
  name: string,
  level?: Level
): PersonaDefinition | null {
  if (name === "gym-leader" && level) {
    return GYM_LEADER_PERSONAS[level] || null;
  }
  return PERSONAS[name] || null;
}
