import type { JSONSchemaType } from "ajv";
import type {
  CaseExcerpt,
  FactPatternTag,
  HumanRightsCodeGround,
} from "./types";

/**
 * `V1_SPOTTED_GROUNDS` in `lib/types.ts` uses `as const satisfies readonly
 * HumanRightsCodeGround[]` because it is a deliberate *subset* — that form
 * only checks "every listed member is valid," which is correct there but
 * would silently tolerate a missing member here, where the whole point is
 * the *complete* set. `satisfies Record<Union, true>` checks both
 * directions on an object literal: TypeScript errors if a member is
 * invalid (extra key) or missing (absent key), which is what QA1's round-1
 * finding on this file asked for.
 */
function membersOf<T extends string>(members: Record<T, true>): readonly T[] {
  return Object.keys(members) as T[];
}

const HUMAN_RIGHTS_CODE_GROUNDS = membersOf({
  "Indigenous identity": true,
  race: true,
  colour: true,
  ancestry: true,
  "place of origin": true,
  "political belief": true,
  religion: true,
  "marital status": true,
  "family status": true,
  "physical or mental disability": true,
  sex: true,
  "sexual orientation": true,
  "gender identity or expression": true,
  age: true,
  "criminal or summary conviction unrelated to the employment": true,
} satisfies Record<HumanRightsCodeGround, true>);

const FACT_PATTERN_TAGS = membersOf({
  "disability-accommodation": true,
  "family-status": true,
  "harassment-poisoned-work-environment": true,
  "age-termination": true,
} satisfies Record<FactPatternTag, true>);

/**
 * JSON Schema for `CaseExcerpt.verifiedDate` — real calendar validation via
 * ajv-formats, not a digit-shape regex. Requirement is ISO 8601, which
 * admits either a plain date or a full date-time, so this is an `anyOf`
 * over both formats rather than a single pattern.
 */
const isoDateStringSchema = {
  type: "string",
  minLength: 1,
  anyOf: [{ format: "date" }, { format: "date-time" }],
} as const;

/**
 * The JSON Schema for one seed-library case record. Typed against
 * `CaseExcerpt` (imported from `lib/types.ts`, never redeclared) via ajv's
 * `JSONSchemaType<T>`, so the schema and the domain type cannot drift out
 * of sync — a field added to, removed from, or retyped on `CaseExcerpt`
 * fails to compile here until this schema is updated to match.
 */
export const caseExcerptJsonSchema: JSONSchemaType<CaseExcerpt> = {
  type: "object",
  properties: {
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    citation: { type: "string", minLength: 1 },
    groundTags: {
      type: "array",
      items: { type: "string", enum: HUMAN_RIGHTS_CODE_GROUNDS },
    },
    factPatternTags: {
      type: "array",
      items: { type: "string", enum: FACT_PATTERN_TAGS },
    },
    outcomeType: { type: "string", minLength: 1 },
    keyFinding: { type: "string", minLength: 1 },
    // sourceUrl exists so a human can re-verify a citation against CanLII
    // or bchrt.bc.ca — it must actually be a URL, not just a non-empty
    // string ("asdf" previously passed).
    sourceUrl: { type: "string", minLength: 1, format: "uri" },
    verifiedBy: { type: "string", minLength: 1 },
    verifiedDate: isoDateStringSchema,
    isPlaceholder: { type: "boolean" },
  },
  required: [
    "id",
    "title",
    "citation",
    "groundTags",
    "factPatternTags",
    "outcomeType",
    "keyFinding",
    "sourceUrl",
    "verifiedBy",
    "verifiedDate",
    "isPlaceholder",
  ],
  additionalProperties: false,
};
