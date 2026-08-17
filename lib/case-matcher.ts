import type {
  CaseExcerpt,
  FactPatternTag,
  FactPromptResponse,
  MatchedTag,
  MatchResult,
  Situation,
} from "./types";
import { CONCERN_TO_FACT_PATTERN_BRIDGE } from "./concern-fact-pattern-bridge";

/**
 * Scoring weights and the relevance threshold — one named, exported,
 * commented config, tunable without touching matching logic (Sprint 4
 * requirement 9). Not tuned against real scenarios; Chang's benchmark
 * set doesn't exist yet. Defensible starting values, not final ones.
 */
export const MATCH_CONFIG = {
  /** Points per bridged fact-pattern tag a case shares with the situation. */
  factPatternWeight: 10,
  /** Points per distinct keyword shared between the situation's text and a case's text. */
  keywordWeight: 2,
  /** Minimum score for a case to be returned at all — an empty result beats a weak one. */
  relevanceThreshold: 10,
  /** At most this many matches are ever returned, per the PRD's "1-2 matched cases". */
  maxMatches: 2,
} as const;

const STOPWORDS = new Set([
  "the", "and", "but", "for", "with", "from", "this", "that", "was",
  "were", "been", "being", "have", "has", "had", "not", "are", "over",
  "what", "which", "their", "them", "they", "after", "before", "about",
  "into", "then", "than", "when", "will", "would", "could", "should",
]);

/** Lowercases and splits on non-alphanumeric runs, dropping short words and stopwords. Pure. */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word)),
  );
}

/** The bridged fact patterns for every concern on the situation, deduplicated. Pure. */
function bridgedFactPatterns(situation: Situation): Set<FactPatternTag> {
  const result = new Set<FactPatternTag>();
  for (const concern of situation.concerns) {
    for (const tag of CONCERN_TO_FACT_PATTERN_BRIDGE[concern]) {
      result.add(tag);
    }
  }
  return result;
}

/**
 * Keyword source text: the narrative plus every reported `facts` entry.
 * Sprint 3's "not reported" marker (`{ reported: false }`) carries no
 * text and contributes nothing — never treated as an empty string that
 * could accidentally match everything.
 */
function situationKeywords(situation: Situation): Set<string> {
  const reportedTexts = situation.facts
    .filter(
      (fact): fact is Extract<FactPromptResponse, { reported: true }> =>
        fact.reported,
    )
    .map((fact) => fact.text);
  return tokenize([situation.narrative, ...reportedTexts].join(" "));
}

function scoreCase(
  factPatterns: ReadonlySet<FactPatternTag>,
  keywords: ReadonlySet<string>,
  caseRecord: CaseExcerpt,
): { score: number; matchedTags: MatchedTag[] } {
  const matchedTags: MatchedTag[] = [];
  let score = 0;

  for (const tag of caseRecord.factPatternTags) {
    if (factPatterns.has(tag)) {
      matchedTags.push({ kind: "fact-pattern", tag });
      score += MATCH_CONFIG.factPatternWeight;
    }
  }

  const caseKeywords = tokenize(`${caseRecord.title} ${caseRecord.keyFinding}`);
  for (const term of keywords) {
    if (caseKeywords.has(term)) {
      matchedTags.push({ kind: "keyword", term });
      score += MATCH_CONFIG.keywordWeight;
    }
  }

  return { score, matchedTags };
}

/**
 * The matcher: a `Situation` and the loaded seed library in, a ranked
 * `MatchResult[]` out. Pure — no network, no filesystem, no clock, no
 * randomness. Never branches on `isPlaceholder` (requirement 11); never
 * reads `groundTags` (requirement 4, Sprint 5's job); never constructs
 * case content, only ever returns records from the passed-in library
 * (requirement 10).
 */
export function matchCases(
  situation: Situation,
  library: readonly CaseExcerpt[],
): MatchResult[] {
  const factPatterns = bridgedFactPatterns(situation);
  const keywords = situationKeywords(situation);

  const scored: MatchResult[] = library.map((caseRecord) => {
    const { score, matchedTags } = scoreCase(factPatterns, keywords, caseRecord);
    return { case: caseRecord, score, matchedTags };
  });

  const relevant = scored.filter(
    (result) => result.score >= MATCH_CONFIG.relevanceThreshold,
  );

  // Deterministic ranking: score descending, then case id ascending as an
  // explicit tie-breaker — never left to array or object iteration order,
  // and never to localeCompare's host-dependent collation.
  relevant.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.case.id < b.case.id) return -1;
    if (a.case.id > b.case.id) return 1;
    return 0;
  });

  return relevant.slice(0, MATCH_CONFIG.maxMatches);
}
