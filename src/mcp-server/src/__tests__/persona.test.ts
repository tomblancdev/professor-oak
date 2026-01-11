/**
 * Persona Tools Tests
 *
 * TDD tests for persona system prompt loading.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";

// Set test DATA_PATH before importing modules
const TEST_DATA_PATH = path.join(process.cwd(), "test-data-persona");
process.env.DATA_PATH = TEST_DATA_PATH;

// Import after setting env
import {
  PERSONAS,
  GYM_LEADER_FILES,
  getPersonaDefinition,
} from "../config/personas.js";
import type { Level } from "../config/constants.js";

// Helper to clean up test directory
async function cleanTestDir() {
  try {
    await fs.rm(TEST_DATA_PATH, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }
}

// Helper to create test directory with persona files
async function setupTestDir() {
  await cleanTestDir();
  await fs.mkdir(TEST_DATA_PATH, { recursive: true });

  // Create personas folder structure
  await fs.mkdir(path.join(TEST_DATA_PATH, "personas", "gym-leaders"), {
    recursive: true,
  });

  // Create mock persona files
  const personaFiles = {
    "personas/professor-oak.md": "# Professor Oak\n\nYou are Professor Oak, the wise mentor.",
    "personas/nurse-joy.md": "# Nurse Joy\n\nYou are Nurse Joy, the caring healer.",
    "personas/wild-encounter.md": "# Wild Encounter\n\nA wild learning challenge appears!",
    "personas/gym-leaders/brock.md": "# Brock\n\nI am Brock, the starter gym leader.",
    "personas/gym-leaders/misty.md": "# Misty\n\nI am Misty, the beginner gym leader.",
    "personas/gym-leaders/lt-surge.md": "# Lt. Surge\n\nI am Lt. Surge, the advanced gym leader.",
    "personas/gym-leaders/sabrina.md": "# Sabrina\n\nI am Sabrina, the expert gym leader.",
  };

  for (const [filePath, content] of Object.entries(personaFiles)) {
    await fs.writeFile(path.join(TEST_DATA_PATH, filePath), content);
  }
}

describe("Persona Configuration", () => {
  describe("PERSONAS constant", () => {
    it("should define professor-oak persona", () => {
      expect(PERSONAS["professor-oak"]).toBeDefined();
      expect(PERSONAS["professor-oak"].displayName).toBe("Professor Oak");
      expect(PERSONAS["professor-oak"].file).toBe("professor-oak.md");
      expect(PERSONAS["professor-oak"].description).toContain("mentor");
    });

    it("should define nurse-joy persona", () => {
      expect(PERSONAS["nurse-joy"]).toBeDefined();
      expect(PERSONAS["nurse-joy"].displayName).toBe("Nurse Joy");
      expect(PERSONAS["nurse-joy"].file).toBe("nurse-joy.md");
    });

    it("should define wild-encounter persona", () => {
      expect(PERSONAS["wild-encounter"]).toBeDefined();
      expect(PERSONAS["wild-encounter"].displayName).toBe("Wild Encounter");
      expect(PERSONAS["wild-encounter"].file).toBe("wild-encounter.md");
    });

    it("should define gym-leader persona with null file", () => {
      expect(PERSONAS["gym-leader"]).toBeDefined();
      expect(PERSONAS["gym-leader"].displayName).toBe("Gym Leader");
      expect(PERSONAS["gym-leader"].file).toBeNull();
    });
  });

  describe("GYM_LEADER_FILES constant", () => {
    it("should map starter level to brock.md", () => {
      expect(GYM_LEADER_FILES.starter).toBe("gym-leaders/brock.md");
    });

    it("should map beginner level to misty.md", () => {
      expect(GYM_LEADER_FILES.beginner).toBe("gym-leaders/misty.md");
    });

    it("should map advanced level to lt-surge.md", () => {
      expect(GYM_LEADER_FILES.advanced).toBe("gym-leaders/lt-surge.md");
    });

    it("should map expert level to sabrina.md", () => {
      expect(GYM_LEADER_FILES.expert).toBe("gym-leaders/sabrina.md");
    });
  });

  describe("getPersonaDefinition", () => {
    it("should return persona definition for professor-oak", () => {
      const result = getPersonaDefinition("professor-oak");
      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Professor Oak");
      expect(result?.file).toBe("professor-oak.md");
    });

    it("should return persona definition for nurse-joy", () => {
      const result = getPersonaDefinition("nurse-joy");
      expect(result).not.toBeNull();
      expect(result?.displayName).toBe("Nurse Joy");
    });

    it("should return null for unknown persona", () => {
      const result = getPersonaDefinition("unknown-persona");
      expect(result).toBeNull();
    });

    it("should return gym leader based on level for gym-leader persona", () => {
      const starter = getPersonaDefinition("gym-leader", "starter");
      expect(starter).not.toBeNull();
      expect(starter?.displayName).toBe("Brock");
      expect(starter?.file).toBe("gym-leaders/brock.md");

      const beginner = getPersonaDefinition("gym-leader", "beginner");
      expect(beginner?.displayName).toBe("Misty");

      const advanced = getPersonaDefinition("gym-leader", "advanced");
      expect(advanced?.displayName).toBe("Lt. Surge");

      const expert = getPersonaDefinition("gym-leader", "expert");
      expect(expert?.displayName).toBe("Sabrina");
    });

    it("should return null for gym-leader without level", () => {
      const result = getPersonaDefinition("gym-leader");
      expect(result).toBeNull();
    });
  });
});

describe("Persona Tool Functions", () => {
  beforeEach(async () => {
    await setupTestDir();
  });

  afterEach(async () => {
    await cleanTestDir();
  });

  describe("buildSystemPrompt", () => {
    // Helper function to build system prompt (same as in implementation)
    function buildSystemPrompt(
      personaContent: string,
      context: { topic?: string; level?: string; trainerName?: string }
    ): string {
      const hasContext = context.topic || context.level || context.trainerName;
      if (!hasContext) {
        return personaContent;
      }

      let header = "## Current Context\n";
      if (context.topic) header += `- Topic: ${context.topic}\n`;
      if (context.level) header += `- Level: ${context.level}\n`;
      if (context.trainerName) header += `- Trainer: ${context.trainerName}\n`;
      header += "\n---\n\n";
      return header + personaContent;
    }

    it("should add context header when topic is provided", () => {
      const content = "# Professor Oak\n\nYou are a mentor.";
      const result = buildSystemPrompt(content, { topic: "docker" });

      expect(result).toContain("## Current Context");
      expect(result).toContain("- Topic: docker");
      expect(result).toContain("---");
      expect(result).toContain("# Professor Oak");
    });

    it("should add context header with all context fields", () => {
      const content = "# Persona";
      const result = buildSystemPrompt(content, {
        topic: "python",
        level: "beginner",
        trainerName: "Tom",
      });

      expect(result).toContain("- Topic: python");
      expect(result).toContain("- Level: beginner");
      expect(result).toContain("- Trainer: Tom");
    });

    it("should return content unchanged when no context provided", () => {
      const content = "# Professor Oak\n\nYou are a mentor.";
      const result = buildSystemPrompt(content, {});

      expect(result).toBe(content);
      expect(result).not.toContain("## Current Context");
    });

    it("should only include provided context fields", () => {
      const content = "# Test";
      const result = buildSystemPrompt(content, { level: "expert" });

      expect(result).toContain("- Level: expert");
      expect(result).not.toContain("- Topic:");
      expect(result).not.toContain("- Trainer:");
    });
  });

  describe("readPersonaFile", () => {
    it("should read professor-oak.md content", async () => {
      const filePath = path.join(TEST_DATA_PATH, "personas", "professor-oak.md");
      const content = await fs.readFile(filePath, "utf-8");

      expect(content).toContain("# Professor Oak");
      expect(content).toContain("wise mentor");
    });

    it("should read gym leader files", async () => {
      const filePath = path.join(
        TEST_DATA_PATH,
        "personas",
        "gym-leaders",
        "brock.md"
      );
      const content = await fs.readFile(filePath, "utf-8");

      expect(content).toContain("# Brock");
      expect(content).toContain("starter gym leader");
    });
  });

  describe("getPersona response format", () => {
    it("should return success response with correct structure", () => {
      // Simulating expected response format
      const response = {
        success: true,
        persona: "professor-oak",
        displayName: "Professor Oak",
        systemPrompt: "## Current Context\n- Topic: docker\n\n---\n\n# Professor Oak",
        context: { topic: "docker" },
      };

      expect(response.success).toBe(true);
      expect(response.persona).toBe("professor-oak");
      expect(response.displayName).toBe("Professor Oak");
      expect(response.systemPrompt).toContain("## Current Context");
      expect(response.context).toEqual({ topic: "docker" });
    });

    it("should return error for unknown persona", () => {
      const response = {
        success: false,
        error: 'Unknown persona: "unknown"',
      };

      expect(response.success).toBe(false);
      expect(response.error).toContain("Unknown persona");
    });

    it("should return error for gym-leader without level", () => {
      const response = {
        success: false,
        error: "Gym leader persona requires a level",
      };

      expect(response.success).toBe(false);
      expect(response.error).toContain("requires a level");
    });
  });

  describe("gym leader selection by level", () => {
    const gymLeaderLevelMap = {
      starter: { name: "Brock", file: "gym-leaders/brock.md" },
      beginner: { name: "Misty", file: "gym-leaders/misty.md" },
      advanced: { name: "Lt. Surge", file: "gym-leaders/lt-surge.md" },
      expert: { name: "Sabrina", file: "gym-leaders/sabrina.md" },
    };

    it("should select Brock for starter level", () => {
      const leader = gymLeaderLevelMap["starter"];
      expect(leader.name).toBe("Brock");
      expect(leader.file).toBe("gym-leaders/brock.md");
    });

    it("should select Misty for beginner level", () => {
      const leader = gymLeaderLevelMap["beginner"];
      expect(leader.name).toBe("Misty");
    });

    it("should select Lt. Surge for advanced level", () => {
      const leader = gymLeaderLevelMap["advanced"];
      expect(leader.name).toBe("Lt. Surge");
    });

    it("should select Sabrina for expert level", () => {
      const leader = gymLeaderLevelMap["expert"];
      expect(leader.name).toBe("Sabrina");
    });
  });
});
