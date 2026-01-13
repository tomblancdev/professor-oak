/**
 * File Lock Service
 *
 * Provides mutex-based locking for YAML file operations to prevent
 * race conditions during concurrent read-modify-write operations.
 */

import { Mutex } from "async-mutex";

// Map of file paths to their associated mutexes
const fileLocks = new Map<string, Mutex>();

/**
 * Get or create a mutex for a file path
 */
function getMutex(relativePath: string): Mutex {
  if (!fileLocks.has(relativePath)) {
    fileLocks.set(relativePath, new Mutex());
  }
  return fileLocks.get(relativePath)!;
}

/**
 * Execute an operation with a file lock to prevent concurrent access.
 *
 * @param relativePath - The file path to lock
 * @param operation - The async operation to execute while holding the lock
 * @returns The result of the operation
 */
export async function withFileLock<T>(
  relativePath: string,
  operation: () => Promise<T>
): Promise<T> {
  const mutex = getMutex(relativePath);
  const release = await mutex.acquire();
  try {
    return await operation();
  } finally {
    release();
  }
}

/**
 * Execute an operation with locks on multiple files.
 * Acquires locks in sorted order to prevent deadlocks.
 *
 * @param filePaths - Array of file paths to lock
 * @param operation - The async operation to execute while holding all locks
 * @returns The result of the operation
 */
export async function withMultiFileLock<T>(
  filePaths: string[],
  operation: () => Promise<T>
): Promise<T> {
  // Sort paths to prevent deadlock
  const sortedPaths = [...filePaths].sort();

  // Get mutexes for all paths
  const mutexes = sortedPaths.map((p) => getMutex(p));

  // Acquire all locks in order
  const releases: Array<() => void> = [];
  try {
    for (const mutex of mutexes) {
      releases.push(await mutex.acquire());
    }
    return await operation();
  } finally {
    // Release all locks in reverse order
    for (const release of releases.reverse()) {
      release();
    }
  }
}

/**
 * Clear all locks (useful for testing)
 */
export function clearAllLocks(): void {
  fileLocks.clear();
}
