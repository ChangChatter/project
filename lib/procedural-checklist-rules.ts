import type { ProceduralCheckItem, Situation } from "./types";

/**
 * Builds the duty-to-accommodate procedural checklist for a Situation.
 * Pure: no model call, no network, no clock, no randomness.
 *
 * All three items are currently `insufficient-information` for every
 * constructible `Situation` — this is a known, owned limitation, not an
 * oversight. See the per-item comments below for why each one is
 * unreachable given what Sprint 3's intake actually collects, and Sprint
 * 5 Amendment 1 requirements 14-17 / Sprint 8 for the resolution.
 */
// Kept in the signature (not dropped) so this function's shape doesn't
// change again once Sprint 8 wires real answers through it; unused until then.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildProceduralChecklist(situation: Situation): ProceduralCheckItem[] {
  return [
    {
      id: "documentation-requested",
      label:
        "Medical or functional-abilities documentation was requested before any request was denied",
      // Sprint 5 Amendment 1 requirement 14, explicit guard: this item
      // previously inferred "done" from any non-empty facts[1] answer.
      // QA1 round 1 found the inference unsafe — the prompt asks *what*
      // was exchanged, never *when* relative to a denial, so "she gave
      // us a note after we'd already denied the request" was scored
      // "done" on the exact gap this checklist exists to catch. No
      // current intake field establishes sequence, and the rules path
      // is correctly barred from inferring it from free text via a
      // model call. Always insufficient-information until Sprint 8 adds
      // a structured question and rewires this item to it — see Sprint
      // 5 Amendment 1 requirements 14-17 and Sprint 8's definition. Do
      // not resolve this by deleting the item or restoring the old
      // inference; both were rejected by Master Controller.
      status: "insufficient-information",
    },
    {
      id: "alternatives-explored",
      label: "Alternative arrangements were explored",
      // Sprint 3's intake never asks this in any structured or free-text
      // form — there is no signal to key off at all. Honest given what's
      // collected, not a placeholder. Sprint 8 adds the question.
      status: "insufficient-information",
    },
    {
      id: "analysis-documented",
      label: "The accommodation analysis was documented",
      // Same reasoning as alternatives-explored: no intake signal exists.
      status: "insufficient-information",
    },
  ];
}
