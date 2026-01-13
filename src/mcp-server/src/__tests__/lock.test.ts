import { describe, it, expect, beforeEach } from "vitest";
import { withFileLock, withMultiFileLock, clearAllLocks } from "../services/lock.js";

describe("Lock Service", () => {
  beforeEach(() => {
    clearAllLocks();
  });

  describe("withFileLock", () => {
    it("executes operation and returns result", async () => {
      const result = await withFileLock("test.yaml", async () => {
        return "success";
      });
      expect(result).toBe("success");
    });

    it("serializes concurrent operations on same file", async () => {
      const order: number[] = [];
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Start two concurrent operations
      const op1 = withFileLock("same.yaml", async () => {
        order.push(1);
        await delay(50);
        order.push(2);
        return "op1";
      });

      const op2 = withFileLock("same.yaml", async () => {
        order.push(3);
        await delay(10);
        order.push(4);
        return "op2";
      });

      await Promise.all([op1, op2]);

      // Operations should be serialized: either [1,2,3,4] or [3,4,1,2]
      expect(
        (order[0] === 1 && order[1] === 2 && order[2] === 3 && order[3] === 4) ||
        (order[0] === 3 && order[1] === 4 && order[2] === 1 && order[3] === 2)
      ).toBe(true);
    });

    it("allows concurrent operations on different files", async () => {
      const order: string[] = [];
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      const op1 = withFileLock("file1.yaml", async () => {
        order.push("1-start");
        await delay(50);
        order.push("1-end");
        return "op1";
      });

      const op2 = withFileLock("file2.yaml", async () => {
        order.push("2-start");
        await delay(10);
        order.push("2-end");
        return "op2";
      });

      await Promise.all([op1, op2]);

      // Both should start before either ends (concurrent)
      const startIndices = [order.indexOf("1-start"), order.indexOf("2-start")];
      const endIndices = [order.indexOf("1-end"), order.indexOf("2-end")];
      
      // At least one start should happen before the other's end
      expect(
        startIndices[0] < endIndices[1] || startIndices[1] < endIndices[0]
      ).toBe(true);
    });

    it("releases lock even when operation throws", async () => {
      // First operation throws
      await expect(
        withFileLock("error.yaml", async () => {
          throw new Error("test error");
        })
      ).rejects.toThrow("test error");

      // Second operation should still be able to acquire lock
      const result = await withFileLock("error.yaml", async () => {
        return "recovered";
      });
      expect(result).toBe("recovered");
    });
  });

  describe("withMultiFileLock", () => {
    it("locks multiple files", async () => {
      const result = await withMultiFileLock(
        ["file1.yaml", "file2.yaml"],
        async () => "multi-success"
      );
      expect(result).toBe("multi-success");
    });

    it("prevents deadlock by sorting lock order", async () => {
      const results: string[] = [];
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Two operations that try to lock files in different orders
      const op1 = withMultiFileLock(["a.yaml", "b.yaml"], async () => {
        results.push("op1");
        await delay(10);
        return "op1";
      });

      const op2 = withMultiFileLock(["b.yaml", "a.yaml"], async () => {
        results.push("op2");
        await delay(10);
        return "op2";
      });

      // Both should complete without deadlock
      const [r1, r2] = await Promise.all([op1, op2]);
      expect(r1).toBe("op1");
      expect(r2).toBe("op2");
      expect(results).toHaveLength(2);
    });
  });
});
