import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import path from "node:path";
import type { CaseExcerpt } from "./types";
import { caseExcerptJsonSchema } from "./seed-library-schema";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateCaseExcerpt = ajv.compile(caseExcerptJsonSchema);

interface RecordValidationFailure {
  recordId: string;
  errors: string[];
}

type RecordValidationResult =
  | { valid: true; record: CaseExcerpt }
  | { valid: false; failure: RecordValidationFailure };

function describeRecordId(record: unknown, index: number): string {
  if (
    typeof record === "object" &&
    record !== null &&
    "id" in record &&
    typeof (record as { id: unknown }).id === "string" &&
    (record as { id: string }).id.length > 0
  ) {
    return (record as { id: string }).id;
  }
  return `<record at index ${index}>`;
}

/** Validates one record against the schema. Pure: no I/O. */
export function validateSeedLibraryRecord(
  record: unknown,
  index: number,
): RecordValidationResult {
  if (validateCaseExcerpt(record)) {
    return { valid: true, record };
  }
  const errors = (validateCaseExcerpt.errors ?? []).map((e) =>
    `${e.instancePath || "(root)"} ${e.message ?? "is invalid"}`.trim(),
  );
  return {
    valid: false,
    failure: { recordId: describeRecordId(record, index), errors },
  };
}

/**
 * Validates every record in an already-parsed array. Pure: no I/O, no
 * network call, no model call. Rejects (throws) naming every offending
 * record and its specific errors, rather than stopping at the first
 * failure, so a single load attempt surfaces everything wrong at once.
 */
export function validateSeedLibrary(records: unknown[]): CaseExcerpt[] {
  const validated: CaseExcerpt[] = [];
  const failures: RecordValidationFailure[] = [];

  records.forEach((record, index) => {
    const result = validateSeedLibraryRecord(record, index);
    if (result.valid) {
      validated.push(result.record);
    } else {
      failures.push(result.failure);
    }
  });

  if (failures.length > 0) {
    const detail = failures
      .map((f) => `  - ${f.recordId}: ${f.errors.join("; ")}`)
      .join("\n");
    throw new Error(
      `Seed library validation failed for ${failures.length} record(s):\n${detail}`,
    );
  }

  return validated;
}

const DEFAULT_SEED_LIBRARY_PATH = path.join(
  process.cwd(),
  "data",
  "seed-library.json",
);

/**
 * Reads and validates the seed library from disk. The only I/O in this
 * module is a read, never a write — see Sprint 2 acceptance criteria.
 * All validation is delegated to the pure `validateSeedLibrary`.
 */
export function loadSeedLibrary(
  filePath: string = DEFAULT_SEED_LIBRARY_PATH,
): CaseExcerpt[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Seed library at ${filePath} must be a JSON array of case records.`,
    );
  }
  return validateSeedLibrary(parsed);
}

/**
 * Typed, exported placeholder-status API — Sprint 2 requirement 7. Sprint 6
 * calls this to refuse rendering placeholder case data in production.
 */
export function placeholderCount(library: CaseExcerpt[]): number {
  return library.filter((record) => record.isPlaceholder).length;
}
