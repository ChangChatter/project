import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Sprint 5 requirement 10: the rules modules never import the prose
 * layer. Checked by reading source text directly rather than by runtime
 * behaviour, since a module simply never calling an imported function
 * would not by itself prove the import doesn't exist.
 */
const RULES_MODULES = [
  "ground-rules.ts",
  "procedural-checklist-rules.ts",
  "escalation-trigger-rules.ts",
  "analysis.ts",
];

describe("rules modules do not import the prose layer", () => {
  for (const filename of RULES_MODULES) {
    it(`${filename} contains no reference to prose-layer`, () => {
      const source = readFileSync(join(import.meta.dirname, filename), "utf-8");
      expect(source).not.toMatch(/prose-layer/);
    });
  }
});
