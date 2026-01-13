import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { readYaml, writeYaml, fileExists, createDirectory, modifyYaml } from "../services/yaml.js";

describe("YAML Service", () => {
  const testDir = path.join(process.cwd(), "test-yaml-data");

  beforeEach(async () => {
    process.env.DATA_PATH = testDir;
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("readYaml", () => {
    it("should return success: false for non-existent file", async () => {
      const result = await readYaml<{ name: string }>("nonexistent.yaml");
      expect(result.success).toBe(false);
      expect(result.error).toContain("nonexistent.yaml");
    });

    it("should parse YAML content correctly", async () => {
      const testData = { name: "Test", value: 42, nested: { key: "value" } };
      await fs.writeFile(
        path.join(testDir, "test.yaml"),
        "name: Test\nvalue: 42\nnested:\n  key: value\n"
      );

      const result = await readYaml<typeof testData>("test.yaml");
      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it("should handle empty YAML files", async () => {
      await fs.writeFile(path.join(testDir, "empty.yaml"), "");
      const result = await readYaml<unknown>("empty.yaml");
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should return error for invalid YAML syntax", async () => {
      await fs.writeFile(path.join(testDir, "invalid.yaml"), "{ invalid yaml:");
      const result = await readYaml<unknown>("invalid.yaml");
      expect(result.success).toBe(false);
      expect(result.error).toContain("invalid.yaml");
    });
  });

  describe("writeYaml", () => {
    it("should write data as YAML", async () => {
      const data = { name: "Test", items: [1, 2, 3] };
      const result = await writeYaml("output.yaml", data);

      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, "output.yaml"), "utf-8");
      expect(content).toContain("name: Test");
      expect(content).toContain("items:");
    });

    it("should create parent directories if needed", async () => {
      const data = { value: "test" };
      const result = await writeYaml("nested/deep/file.yaml", data);

      expect(result.success).toBe(true);
      const exists = await fs.access(path.join(testDir, "nested/deep/file.yaml"))
        .then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should add header comment when provided", async () => {
      const data = { name: "Test" };
      const result = await writeYaml("with-header.yaml", data, "My Header");

      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, "with-header.yaml"), "utf-8");
      expect(content).toContain("# My Header");
      expect(content).toContain("# DO NOT EDIT DIRECTLY");
    });

    it("should not add header when not provided", async () => {
      const data = { name: "Test" };
      const result = await writeYaml("no-header.yaml", data);

      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(testDir, "no-header.yaml"), "utf-8");
      expect(content).not.toContain("#");
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      await fs.writeFile(path.join(testDir, "exists.yaml"), "content");
      const exists = await fileExists("exists.yaml");
      expect(exists).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      const exists = await fileExists("does-not-exist.yaml");
      expect(exists).toBe(false);
    });

    it("should return true for existing directory", async () => {
      await fs.mkdir(path.join(testDir, "mydir"), { recursive: true });
      const exists = await fileExists("mydir");
      expect(exists).toBe(true);
    });
  });

  describe("createDirectory", () => {
    it("should create single directory", async () => {
      const result = await createDirectory("newdir");
      expect(result.success).toBe(true);

      const stat = await fs.stat(path.join(testDir, "newdir"));
      expect(stat.isDirectory()).toBe(true);
    });

    it("should create nested directories", async () => {
      const result = await createDirectory("level1/level2/level3");
      expect(result.success).toBe(true);

      const stat = await fs.stat(path.join(testDir, "level1/level2/level3"));
      expect(stat.isDirectory()).toBe(true);
    });

    it("should succeed if directory already exists", async () => {
      await fs.mkdir(path.join(testDir, "existing"), { recursive: true });
      const result = await createDirectory("existing");
      expect(result.success).toBe(true);
    });
  });

  describe("modifyYaml", () => {
    it("should modify existing data", async () => {
      await writeYaml("modify-test.yaml", { count: 1 });

      const result = await modifyYaml<{ count: number }>(
        "modify-test.yaml",
        (data) => ({ count: data.count + 1 })
      );

      expect(result.success).toBe(true);
      expect(result.data?.count).toBe(2);

      const readBack = await readYaml<{ count: number }>("modify-test.yaml");
      expect(readBack.data?.count).toBe(2);
    });

    it("should use defaultData for non-existent file", async () => {
      const result = await modifyYaml<{ items: string[] }>(
        "new-file.yaml",
        (data) => ({ items: [...data.items, "added"] }),
        { defaultData: { items: [] } }
      );

      expect(result.success).toBe(true);
      expect(result.data?.items).toEqual(["added"]);
    });

    it("should return error if file not found and no defaultData", async () => {
      const result = await modifyYaml<{ value: number }>(
        "missing.yaml",
        (data) => ({ value: data.value + 1 })
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing.yaml");
    });

    it("should add header when option provided", async () => {
      await writeYaml("header-test.yaml", { name: "original" });

      await modifyYaml<{ name: string }>(
        "header-test.yaml",
        (data) => ({ name: data.name + "-modified" }),
        { header: "Modified File" }
      );

      const content = await fs.readFile(path.join(testDir, "header-test.yaml"), "utf-8");
      expect(content).toContain("# Modified File");
    });
  });
});
