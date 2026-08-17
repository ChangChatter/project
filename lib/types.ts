/**
 * Single source of truth for every domain type in this app. Every file
 * imports from here — see CLAUDE.md's "Domain types" standard. No domain
 * shape is ever redeclared, aliased, or narrowed inline elsewhere.
 *
 * Several types below are intentionally stubs: the sprint that owns their
 * full detail (noted per type) may refine their internal shape, but the
 * name and top-level shape are locked here so Sprints 2 and 3 can run in
 * parallel without both needing to edit this file.
 */

/**
 * The four operational, employer-observable intake concerns from the PRD
 * — phrased as an employer would describe the situation, not as a legal
 * characterization. Deliberately a different vocabulary from
 * `FactPatternTag`, which tags what a case is *about* in legal terms —
 * see Sprint 3 Amendment 1. Mapping one onto the other is the
 * issue-spotting this tool exists to do (Sprint 4 for case selection,
 * Sprint 5 for ground identification), never something the intake form
 * itself does.
 */
export type ConcernCategory =
  | "medical-absence"
  | "schedule-flexibility"
  | "interpersonal-conflict"
  | "performance-management";

/**
 * The four legal fact patterns the seed library tags cases with. Split
 * from `ConcernCategory` in Sprint 3 Amendment 1 — see that type's doc
 * comment for why the two vocabularies must stay separate.
 */
export type FactPatternTag =
  | "disability-accommodation"
  | "family-status"
  | "harassment-poisoned-work-environment"
  | "age-termination";

/**
 * An ISO 8601 date or date-time string. Named so every timestamp in this
 * file shares one documented convention instead of drifting between bare
 * `string` fields — see Sprint 1 Amendment 1, requirement 15.
 */
export type ISODateString = string;

/** Employment status as of intake — Sprint 3 requirement 2's closed set. */
export type EmploymentStatus = "active" | "suspended" | "terminated";

/**
 * Structured context captured in intake step 1 (metadata) — finalized by
 * Sprint 3 Amendment 1 requirement 11.
 */
export interface IntakeMetadata {
  /** Always BC for v1 — the product scopes to the BC Human Rights Code. */
  province: "BC";
  employmentStatus: EmploymentStatus;
  /** Free-text length of employment, e.g. "2 years", "8 months". */
  tenure: string;
  /** Whether a formal complaint has been lodged to date, by either party. */
  formalComplaintsLodged: boolean;
  submittedAt: ISODateString;
}

/**
 * One of the three guided fact-narrative prompt responses — either
 * supplied text or an explicit "nothing yet / not applicable" marker.
 * Kept as a real type-level distinction, not inferred from an empty
 * string, per Sprint 3 Amendment 2 requirement 14: Sprint 5's three-state
 * `ProceduralCheckStatus` needs to tell "no documentation was exchanged"
 * (a real, legally significant fact) apart from "the employer skipped the
 * question" (missing information), and an empty string can't carry that
 * distinction.
 */
export type FactPromptResponse = { reported: true; text: string } | { reported: false };

/**
 * The validated output of the full three-step intake flow (metadata,
 * concern selection, guided fact narrative). Every later analysis step
 * consumes this and only this. Stubbed; Sprint 3 owns the final shape of
 * the guided-narrative fields.
 */
export interface Situation {
  metadata: IntakeMetadata;
  /**
   * One or more concerns — Sprint 3 requirement 3 and the PRD both specify
   * multi-select. A situation involving disability and family status
   * together is a core case, not an edge case, so the empty case is
   * excluded at the type level rather than left to runtime validation.
   */
  concerns: [ConcernCategory, ...ConcernCategory[]];
  /**
   * Free-text narrative supplied during the guided fact-gathering step —
   * the reported entries of `facts`, joined for the prose layer's benefit.
   * Not the source of truth; `facts` is.
   */
  narrative: string;
  /**
   * The three requirement-4 prompt responses, in order: what happened,
   * what documentation or medical information has been exchanged, what
   * action the employer is considering. Always exactly three — one per
   * prompt, never filtered — per Sprint 3 Amendment 2 requirement 14.
   */
  facts: [FactPromptResponse, FactPromptResponse, FactPromptResponse];
}

/**
 * The closed set of grounds on which the BC Human Rights Code prohibits
 * employment discrimination — Human Rights Code, RSBC 1996, c 210, s 13,
 * https://www.bclaws.gov.bc.ca/civix/document/id/consol41/consol41/00_96210_01.
 * Exactly 15 members, verified against secondary sources by Chang per
 * Sprint 1 Amendment 1 requirement 10, with a direct statute check still
 * open (see the sprint file's Dependencies section) before verified case
 * data enters the Sprint 2 seed library.
 *
 * Two structurally distinct categories, kept in one union because
 * `CaseExcerpt.groundTags` must be able to tag any decision the seed
 * library holds — a triage tool gains nothing at match time from two
 * separate ground types:
 *
 * This models the grounds that **exist in the Code**, not the grounds the
 * v1 rules engine can identify — see `V1_SPOTTED_GROUNDS` for that subset.
 * `CaseExcerpt` describes real, human-verified Tribunal decisions, and a
 * verified case turning on a ground outside v1's four fact patterns must
 * still be representable here; narrowing this union to v1's coverage would
 * force the verification track to distort real decisions to fit the code.
 *
 * Harassment is deliberately absent: under the Code, harassment is
 * discrimination *on the basis of* a ground, not a ground itself, and is
 * already modelled as a `FactPatternTag`.
 */
export type HumanRightsCodeGround =
  // Section 13(1) protected characteristics (14).
  | "Indigenous identity"
  | "race"
  | "colour"
  | "ancestry"
  | "place of origin"
  | "political belief"
  | "religion"
  | "marital status"
  | "family status"
  | "physical or mental disability"
  | "sex"
  | "sexual orientation"
  | "gender identity or expression"
  | "age"
  // Separately prohibited ground (1) — not a s 13(1) characteristic, but
  // an independently prohibited basis for employment discrimination.
  | "criminal or summary conviction unrelated to the employment";

/**
 * The subset of `HumanRightsCodeGround` the v1 rules engine can actually
 * identify. Typed as a subset of the full statutory union, so a typo or a
 * ground outside the Code fails to compile. Sprint 5's rules operate over
 * this constant, not over the full union — see Sprint 1 Amendment 1,
 * requirement 11.
 */
export const V1_SPOTTED_GROUNDS = [
  "physical or mental disability",
  "family status",
  "sex",
  "age",
] as const satisfies readonly HumanRightsCodeGround[];

/** A ground the v1 rules engine can identify — `V1_SPOTTED_GROUNDS[number]`. */
export type V1SpottedGround = (typeof V1_SPOTTED_GROUNDS)[number];

/**
 * A BC Human Rights Code ground identified by the rules-based spotter for
 * a given Situation, together with the specific facts that triggered it.
 * Never a finding of liability — always phrased as plausible and worth
 * examining. Stubbed; Sprint 5 owns the final rules shape.
 */
export interface CodeGround {
  ground: HumanRightsCodeGround;
  /** The specific intake facts that triggered this ground, for traceability. */
  triggeredBy: string[];
  /** Plain-language explanation, filled in by the prose layer. */
  explanation?: string;
}

/**
 * The three-state status of a single duty-to-accommodate procedural
 * line item. Distinguishes "not done" (established by the intake) from
 * "not enough information" (never asserted as a gap the intake didn't
 * actually establish).
 */
export type ProceduralCheckStatus = "done" | "not-done" | "insufficient-information";

/**
 * One duty-to-accommodate procedural line item produced by the rules
 * engine (e.g. "was medical documentation requested before denial").
 * Stubbed; Sprint 5 owns the final set of checklist items.
 */
export interface ProceduralCheckItem {
  id: string;
  label: string;
  status: ProceduralCheckStatus;
}

/**
 * A verified BC HRT case excerpt from the seed library. Verification
 * provenance is non-optional by design: a record that cannot say who
 * verified it, when, and against what source is not representable here.
 * Stubbed; Sprint 2 owns the schema's final constraints (e.g. the
 * `outcomeType` value set) and the placeholder-record convention.
 */
export interface CaseExcerpt {
  id: string;
  title: string;
  citation: string;
  /** Grounds this case is relevant to. */
  groundTags: HumanRightsCodeGround[];
  /** Constrained to the PRD's four v1 fact patterns. */
  factPatternTags: FactPatternTag[];
  outcomeType: string;
  keyFinding: string;
  sourceUrl: string;
  verifiedBy: string;
  verifiedDate: ISODateString;
  /**
   * Required, not optional: a record's placeholder status must always be
   * an explicit decision, never an implicit default. An omitted field
   * defaulting to falsy would mean "unset" silently reads as "verified,
   * safe to render" — the wrong direction to fail in. `true` only for a
   * Sprint 2 placeholder record (literal title
   * `[VERIFIED CASE CITATION NEEDED]`), `false` only once verification
   * provenance is genuinely established. Lets the render path refuse to
   * show placeholders as though they were real.
   */
  isPlaceholder: boolean;
}

/**
 * One ranked case match for a Situation, produced by the deterministic
 * tag/keyword matcher. Stubbed; Sprint 4 owns the final scoring and
 * tie-break shape.
 */
export interface MatchResult {
  case: CaseExcerpt;
  score: number;
  matchedTags: string[];
}

/**
 * Whether a next-step item is something the employer can action
 * internally, or a trigger that means counsel should be consulted.
 * The distinction must be structural, never just a shared list with a
 * heading — see Sprint 6 requirement 3.
 */
export type EscalationTriggerKind = "internal-action" | "counsel-trigger";

/**
 * One next-step item on the issue guide, tagged as either an internal
 * action or a counsel trigger. Stubbed; Sprint 6 owns the final set of
 * standing and rules-derived triggers.
 */
export interface EscalationTrigger {
  kind: EscalationTriggerKind;
  label: string;
  description: string;
}

interface IssueGuideCore {
  grounds: CodeGround[];
  proceduralChecklist: ProceduralCheckItem[];
  escalationTriggers: EscalationTrigger[];
}

/**
 * The complete rendered issue guide: identified grounds, procedural
 * checklist, matched cases, and next steps. Assembled and rendered by
 * Sprint 6, behind the acknowledgment gate and the Sprint 2 citation
 * guard on every render.
 *
 * Discriminated on `casesWithheld` so the guard's invariant is enforced
 * by the type, not just documented: a withheld render cannot also carry
 * populated matches, because `matches` is typed `[]` on that branch. The
 * guide must never render an unverified citation.
 */
export type IssueGuide =
  | (IssueGuideCore & { casesWithheld: false; matches: MatchResult[] })
  | (IssueGuideCore & { casesWithheld: true; matches: [] });

/**
 * A persisted session pairing a Situation with the issue guide generated
 * from it. Stubbed and unowned: session persistence is Sprint 7, which is
 * blocked pending the security/privacy decision on what a SessionRecord
 * may contain (see CLAUDE.md's "Not yet decided" section). Do not persist
 * this shape anywhere until that decision lands.
 */
export interface SessionRecord {
  id: string;
  createdAt: ISODateString;
  situation: Situation;
  issueGuide?: IssueGuide;
}
