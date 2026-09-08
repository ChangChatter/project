import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

/**
 * Sprint 11 requirement 10: lib/guide.ts declares twelve domain-shaped
 * types outside lib/types.ts, so importing it anywhere is an automatic
 * CLAUDE.md domain-types FAIL until those types are relocated — which
 * belongs to the sprint that first needs the file. Checked by reading
 * source text directly, same approach as module-boundaries.test.ts.
 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "guide.ts" || entry.name === "guide-import-boundary.test.ts") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

describe("no file imports lib/guide.ts", () => {
  const root = join(import.meta.dirname, "..");
  const files = [
    ...collectSourceFiles(join(root, "app")),
    ...collectSourceFiles(join(root, "components")),
    ...collectSourceFiles(join(root, "lib")),
  ];

  for (const file of files) {
    const label = file.slice(root.length + 1).replace(/\\/g, "/");
    it(`${label} does not import guide.ts`, () => {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toMatch(/from\s+["'][^"']*\/guide["']/);
      expect(source).not.toMatch(/from\s+["']\.\/guide["']/);
    });
  }
});
