import type { Situation } from "./types";
import { analyzeSituation, type AnalysisResult } from "./analysis";
import { buildProsePayload } from "./prose-payload";
import { generateProse } from "./prose-layer";

export interface IssueAnalysis extends AnalysisResult {
  /**
   * Plain-language prose, or `null` if the prose layer was unavailable.
   * The structured fields above are always complete either way — legal
   * content never depends on model availability (Sprint 5 requirement 11).
   */
  prose: string | null;
}

/**
 * The complete Sprint 5 pipeline: runs the pure rules, then attempts to
 * phrase the result in plain language. This is the deliberate single
 * point where the prose-layer module boundary is crossed (requirement
 * 10) — `analyzeSituation` and everything it calls stay pure.
 */
export async function analyzeAndPhrase(situation: Situation): Promise<IssueAnalysis> {
  const result = analyzeSituation(situation);
  const payload = buildProsePayload(result);
  const prose = await generateProse(payload);
  return { ...result, prose };
}
