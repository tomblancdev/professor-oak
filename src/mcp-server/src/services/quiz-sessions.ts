/**
 * Quiz Sessions Persistence Service
 *
 * Persists quiz sessions to YAML file to survive server restarts.
 * Includes automatic cleanup of expired sessions.
 */

import { readYaml, writeYaml, fileExists } from "./yaml.js";
import type { QuizSession } from "../types/quiz.js";

// Session expiry time (1 hour in milliseconds)
const SESSION_EXPIRY_MS = 60 * 60 * 1000;

// In-memory cache of sessions (synced with file)
const sessionsCache = new Map<string, QuizSession>();

// Flag to track if sessions have been loaded
let sessionsLoaded = false;

interface PersistedSessions {
  version: number;
  sessions: Array<QuizSession & { expiresAt: string }>;
}

/**
 * Load sessions from file into memory cache
 */
export async function loadSessions(): Promise<void> {
  if (sessionsLoaded) return;

  const result = await readYaml<PersistedSessions>("quiz-sessions.yaml");
  
  if (result.success && result.data) {
    const now = Date.now();
    
    for (const session of result.data.sessions) {
      const expiresAt = new Date(session.expiresAt).getTime();
      
      // Only load non-expired sessions
      if (expiresAt > now) {
        sessionsCache.set(session.sessionId, session);
      }
    }
  }
  
  sessionsLoaded = true;
}

/**
 * Save all sessions to file
 */
async function saveSessions(): Promise<void> {
  const sessions: Array<QuizSession & { expiresAt: string }> = [];
  const now = Date.now();
  
  for (const [, session] of sessionsCache) {
    // Calculate expiry time from startedAt
    const startedAt = new Date(session.startedAt).getTime();
    const expiresAt = new Date(startedAt + SESSION_EXPIRY_MS).toISOString();
    
    // Only save non-expired sessions
    if (new Date(expiresAt).getTime() > now) {
      sessions.push({ ...session, expiresAt });
    }
  }
  
  const data: PersistedSessions = {
    version: 1,
    sessions,
  };
  
  await writeYaml("quiz-sessions.yaml", data, "Quiz Sessions");
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<QuizSession | undefined> {
  await loadSessions();
  
  const session = sessionsCache.get(sessionId);
  if (!session) return undefined;
  
  // Check if session has expired
  const startedAt = new Date(session.startedAt).getTime();
  if (Date.now() - startedAt > SESSION_EXPIRY_MS) {
    // Session expired, remove it
    await removeSession(sessionId);
    return undefined;
  }
  
  return session;
}

/**
 * Create or update a session
 */
export async function saveSession(session: QuizSession): Promise<void> {
  await loadSessions();
  sessionsCache.set(session.sessionId, session);
  await saveSessions();
}

/**
 * Remove a session
 */
export async function removeSession(sessionId: string): Promise<void> {
  await loadSessions();
  sessionsCache.delete(sessionId);
  await saveSessions();
}

/**
 * Check if a session exists
 */
export async function hasSession(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  return session !== undefined;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  await loadSessions();
  
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessionsCache) {
    const startedAt = new Date(session.startedAt).getTime();
    if (now - startedAt > SESSION_EXPIRY_MS) {
      sessionsCache.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    await saveSessions();
  }
  
  return cleanedCount;
}

/**
 * Get all active sessions (for debugging/admin)
 */
export async function getAllSessions(): Promise<QuizSession[]> {
  await loadSessions();
  await cleanupExpiredSessions();
  return Array.from(sessionsCache.values());
}

/**
 * Clear all sessions (useful for testing)
 */
export async function clearAllSessions(): Promise<void> {
  sessionsCache.clear();
  sessionsLoaded = false;
  await saveSessions();
}

/**
 * Reset loaded state (useful for testing)
 */
export function resetLoadedState(): void {
  sessionsCache.clear();
  sessionsLoaded = false;
}
