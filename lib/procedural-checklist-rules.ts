import type {
  AlternativesExploredAnswer,
  DutyToAccommodateAnswers,
  ProceduralCheckItem,
  ProceduralCheckStatus,
  Situation,
  WrittenRecordAnswer,
} from "./types";

function documentationRequestedStatus(
  answers: DutyToAccommodateAnswers,
): ProceduralCheckStatus {
  if (answers.requestStatus === "not-sure") {
    // An unknown request status cannot establish that the "denied"
    // precondition did not occur — Sprint 8 requirement 18.
    return "insufficient-information";
  }
  if (answers.requestStatus !== "denied") {
    // No request was ever turned down, so there is nothing for this item
    // to assess — Sprint 8 requirement 17.
    return "not-applicable";
  }
  switch (answers.documentationTiming) {
    case "before-decision":
      return "done";
    case "after-decision":
    case "never-requested":
      return "not-done";
    case "not-sure":
    case null:
      return "insufficient-information";
  }
}

function yesNoStatus(answer: AlternativesExploredAnswer | WrittenRecordAnswer): ProceduralCheckStatus {
  switch (answer) {
    case "yes":
      return "done";
    case "no":
      return "not-done";
    case "not-sure":
      return "insufficient-information";
  }
}

/**
 * Builds the duty-to-accommodate procedural checklist for a Situation.
 * Pure: no model call, no network, no clock, no randomness.
 */
export function buildProceduralChecklist(situation: Situation): ProceduralCheckItem[] {
  const { dutyToAccommodate } = situation;
  return [
    {
      id: "documentation-requested",
      label:
        "Medical or functional-abilities documentation was requested before any request was denied",
      status: documentationRequestedStatus(dutyToAccommodate),
    },
    {
      id: "alternatives-explored",
      label: "Alternative arrangements were explored",
      status: yesNoStatus(dutyToAccommodate.alternativesExplored),
    },
    {
      id: "analysis-documented",
      label: "The accommodation analysis was documented",
      status: yesNoStatus(dutyToAccommodate.writtenRecord),
    },
  ];
}
