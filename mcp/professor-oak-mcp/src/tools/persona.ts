/**
 * Persona Tools
 *
 * Tools for getting persona system prompts with context injection.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import {
  PERSONAS,
  GYM_LEADER_FILES,
  GYM_LEADER_NAMES,
  getPersonaDefinition,
} from "../config/personas.js";
import { isValidLevel, type Level } from "../config/constants.js";

/**
 * Get the data path from environment variable.
 * Uses lazy evaluation to allow tests to set DATA_PATH before each test.
 */
function getDataPath(): string {
  return process.env.DATA_PATH || "/data";
}

/**
 * Build system prompt with context header
 */
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

/**
 * Read persona file from personas/ folder
 */
async function readPersonaFile(relativePath: string): Promise<string | null> {
  try {
    const fullPath = path.join(getDataPath(), "personas", relativePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch {
    return null;
  }
}

export function registerPersonaTools(server: McpServer) {
  /**
   * Get persona system prompt with context
   */
  server.tool(
    "getPersona",
    `Get a persona's system prompt with optional context injection.
     Use this when switching personas for different interactions.
     Available personas: professor-oak, nurse-joy, wild-encounter, gym-leader (requires level).`,
    {
      persona: z
        .enum(["professor-oak", "nurse-joy", "wild-encounter", "gym-leader"])
        .describe("The persona to load"),
      context: z
        .object({
          topic: z.string().optional().describe("Current learning topic"),
          level: z
            .enum(["starter", "beginner", "advanced", "expert"])
            .optional()
            .describe("Current level (required for gym-leader)"),
          trainerName: z.string().optional().describe("Trainer's name"),
        })
        .optional()
        .describe("Context to inject into the system prompt"),
    },
    async ({ persona, context = {} }) => {
      // Handle gym-leader persona
      if (persona === "gym-leader") {
        if (!context.level) {
          return jsonResponse({
            success: false,
            error: "Gym leader persona requires a level (starter, beginner, advanced, expert)",
          });
        }

        const level = context.level as Level;
        const file = GYM_LEADER_FILES[level];
        const displayName = GYM_LEADER_NAMES[level];

        if (!file || !displayName) {
          return jsonResponse({
            success: false,
            error: `Invalid level for gym leader: "${context.level}"`,
          });
        }

        const personaContent = await readPersonaFile(file);
        if (!personaContent) {
          return jsonResponse({
            success: false,
            error: `Failed to read gym leader persona file: ${file}`,
          });
        }

        const systemPrompt = buildSystemPrompt(personaContent, context);

        return jsonResponse({
          success: true,
          persona: "gym-leader",
          displayName,
          systemPrompt,
          context,
        });
      }

      // Handle other personas
      const personaDef = getPersonaDefinition(persona);
      if (!personaDef || !personaDef.file) {
        return jsonResponse({
          success: false,
          error: `Unknown persona: "${persona}"`,
        });
      }

      const personaContent = await readPersonaFile(personaDef.file);
      if (!personaContent) {
        return jsonResponse({
          success: false,
          error: `Failed to read persona file: ${personaDef.file}`,
        });
      }

      const systemPrompt = buildSystemPrompt(personaContent, context);

      return jsonResponse({
        success: true,
        persona,
        displayName: personaDef.displayName,
        systemPrompt,
        context,
      });
    }
  );
}

// Helper function
function jsonResponse(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}
