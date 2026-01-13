import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import {
  getSession,
  saveSession,
  removeSession,
  hasSession,
  cleanupExpiredSessions,
  getAllSessions,
  clearAllSessions,
  resetLoadedState,
} from "../services/quiz-sessions.js";
import type { QuizSession } from "../types/quiz.js";

describe("Quiz Sessions Persistence", () => {
  const testDataPath = path.join(process.cwd(), "test-data-sessions");

  beforeEach(async () => {
    // Reset state and create test directory
    resetLoadedState();
    process.env.DATA_PATH = testDataPath;
    await fs.mkdir(testDataPath, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDataPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  const createTestSession = (id: string, startedAt?: string): QuizSession => ({
    sessionId: id,
    topic: "test-topic",
    course: "test-course",
    level: "starter",
    type: "standard",
    pokemon: {
      pokedexNumber: 25,
      name: "Pikachu",
      tier: 2,
    },
    parameters: {
      questionCount: 4,
      passThreshold: 0.75,
      passCount: 3,
    },
    startedAt: startedAt || new Date().toISOString(),
  });

  describe("saveSession and getSession", () => {
    it("saves and retrieves a session", async () => {
      const session = createTestSession("test-1");
      
      await saveSession(session);
      const retrieved = await getSession("test-1");
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe("test-1");
      expect(retrieved?.pokemon.name).toBe("Pikachu");
    });

    it("returns undefined for non-existent session", async () => {
      const session = await getSession("non-existent");
      expect(session).toBeUndefined();
    });
  });

  describe("removeSession", () => {
    it("removes a session", async () => {
      const session = createTestSession("test-2");
      await saveSession(session);
      
      expect(await hasSession("test-2")).toBe(true);
      
      await removeSession("test-2");
      
      expect(await hasSession("test-2")).toBe(false);
    });
  });

  describe("hasSession", () => {
    it("returns true for existing session", async () => {
      const session = createTestSession("test-3");
      await saveSession(session);
      
      expect(await hasSession("test-3")).toBe(true);
    });

    it("returns false for non-existent session", async () => {
      expect(await hasSession("non-existent")).toBe(false);
    });
  });

  describe("session expiry", () => {
    it("returns undefined for expired session", async () => {
      // Create session that started 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const session = createTestSession("expired-1", twoHoursAgo);
      
      await saveSession(session);
      
      // Getting expired session should return undefined
      const retrieved = await getSession("expired-1");
      expect(retrieved).toBeUndefined();
    });

    it("cleanupExpiredSessions removes old sessions", async () => {
      // Create fresh session
      const freshSession = createTestSession("fresh-1");
      await saveSession(freshSession);
      
      // Create expired session
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const expiredSession = createTestSession("expired-2", twoHoursAgo);
      await saveSession(expiredSession);
      
      const cleanedCount = await cleanupExpiredSessions();
      
      expect(cleanedCount).toBe(1);
      expect(await hasSession("fresh-1")).toBe(true);
      expect(await hasSession("expired-2")).toBe(false);
    });
  });

  describe("getAllSessions", () => {
    it("returns all active sessions", async () => {
      await saveSession(createTestSession("all-1"));
      await saveSession(createTestSession("all-2"));
      
      const sessions = await getAllSessions();
      
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId).sort()).toEqual(["all-1", "all-2"]);
    });
  });

  describe("clearAllSessions", () => {
    it("removes all sessions", async () => {
      await saveSession(createTestSession("clear-1"));
      await saveSession(createTestSession("clear-2"));
      
      await clearAllSessions();
      
      const sessions = await getAllSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe("persistence across reloads", () => {
    it("sessions survive resetLoadedState (simulating restart)", async () => {
      const session = createTestSession("persist-1");
      await saveSession(session);
      
      // Simulate server restart by resetting loaded state
      resetLoadedState();
      
      // Session should still be retrievable from file
      const retrieved = await getSession("persist-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe("persist-1");
    });
  });
});
