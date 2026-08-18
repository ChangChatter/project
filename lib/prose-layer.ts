import Anthropic from "@anthropic-ai/sdk";
import type { ProsePayload } from "./prose-payload";

const REQUEST_TIMEOUT_MS = 10_000;

function buildPrompt(payload: ProsePayload): string {
  return [
    "Rewrite the following structured legal-triage findings into clear,",
    "plain-language prose for a BC employer. The grounds, checklist items,",
    "and triggers below are already decided — do not add, remove, or",
    "reweigh any of them, do not state a likelihood or predicted outcome,",
    "and do not invent facts beyond what is listed.",
    "",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

/**
 * Calls the LLM to rewrite the structured rules output into plain
 * language. Returns `null` on any failure — no API key, network error,
 * timeout, malformed response — so the caller degrades to the structured
 * rules output rather than failing the request (Sprint 5 requirement
 * 11). Legal content never depends on this function succeeding.
 *
 * This is the sole crossing point of the prose-layer module boundary
 * (requirement 10): the rules modules (`ground-rules.ts`,
 * `procedural-checklist-rules.ts`, `escalation-trigger-rules.ts`,
 * `analysis.ts`) never import this file. Only the caller that already
 * has a `ProsePayload` — built with no access to `Situation` at all —
 * reaches this module.
 */
export async function generateProse(payload: ProsePayload): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(payload) }],
    });

    const textBlock = response.content.find(
      (block): block is Extract<typeof block, { type: "text" }> => block.type === "text",
    );
    return textBlock?.text ?? null;
  } catch (error) {
    // Degradation is correct (requirement 11); silence is not. A missing
    // key returns early above without logging, since that's an expected,
    // non-error condition — this branch is a real failure (network error,
    // timeout, malformed response) and must stay distinguishable from
    // "no key configured", not disappear into the same silent null.
    console.error("prose-layer: generateProse failed, degrading to structured output", error);
    return null;
  }
}
