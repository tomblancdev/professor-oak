#!/usr/bin/env node

/**
 * Professor Oak MCP Server
 *
 * Gamified learning system with Pokemon-themed progress tracking.
 * This server handles all game logic and state management.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Tool registrations (to be implemented in Phase 2)
// import { registerTopicTools } from "./tools/topic.js";
// import { registerProgressTools } from "./tools/progress.js";
// import { registerTrainerTools } from "./tools/trainer.js";
// import { registerPokedexTools } from "./tools/pokedex.js";
// import { registerQuizTools } from "./tools/quiz.js";
// import { registerRewardsTools } from "./tools/rewards.js";
// import { registerPersonaTools } from "./tools/persona.js";

// Create server
const server = new McpServer({
  name: "professor-oak",
  version: "1.0.0",
});

// Register all tools (Phase 2)
// registerTopicTools(server);
// registerProgressTools(server);
// registerTrainerTools(server);
// registerPokedexTools(server);
// registerQuizTools(server);
// registerRewardsTools(server);
// registerPersonaTools(server);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Professor Oak MCP Server running!");
}

main().catch(console.error);
