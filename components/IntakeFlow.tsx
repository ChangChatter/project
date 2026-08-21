"use client";

import { useId, useState } from "react";
import type {
  AlternativesExploredAnswer,
  ConcernCategory,
  DocumentationTimingAnswer,
  EmploymentStatus,
  RequestStatusAnswer,
  Situation,
  WrittenRecordAnswer,
} from "@/lib/types";
import {
  MIN_DOCUMENTATION_LENGTH,
  MIN_EMPLOYER_ACTION_LENGTH,
  MIN_WHAT_HAPPENED_LENGTH,
  toFactPromptResponse,
  toNarrative,
  validateConcerns,
  validatePrompt,
  visibleProceduralQuestions,
} from "@/lib/intake-validation";

const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "terminated", label: "Terminated" },
];

const CONCERN_OPTIONS: { value: ConcernCategory; label: string }[] = [
  { value: "medical-absence", label: "Medical / absence" },
  { value: "schedule-flexibility", label: "Schedule flexibility" },
  { value: "interpersonal-conflict", label: "Interpersonal conflict" },
  { value: "performance-management", label: "Performance management" },
];

const STEP_LABELS = ["Context and metadata", "Primary concern", "Fact narrative"];

// Sprint 8 requirement 16: exact wording and options, reviewed for
// leading/ambiguous phrasing. Wording changes are Master Controller's,
// not Dev Team's.

const REQUEST_STATUS_OPTIONS: { value: RequestStatusAnswer; label: string }[] = [
  { value: "agreed", label: "Yes — and it has been agreed to" },
  { value: "denied", label: "Yes — and it has been turned down" },
  { value: "pending", label: "Yes — and no decision has been made yet" },
  { value: "no-request", label: "No request has been made" },
  { value: "not-sure", label: "Not sure / I don't have that information" },
];

const DOCUMENTATION_TIMING_OPTIONS: { value: DocumentationTimingAnswer; label: string }[] = [
  { value: "before-decision", label: "Before the decision was made" },
  { value: "after-decision", label: "Only after the decision was made" },
  { value: "never-requested", label: "It was never requested" },
  { value: "not-sure", label: "Not sure / I don't have that information" },
];

const ALTERNATIVES_EXPLORED_OPTIONS: { value: AlternativesExploredAnswer; label: string }[] = [
  { value: "yes", label: "Yes, other options were considered" },
  { value: "no", label: "No, other options were not considered" },
  { value: "not-sure", label: "Not sure / I don't have that information" },
];

const WRITTEN_RECORD_OPTIONS: { value: WrittenRecordAnswer; label: string }[] = [
  { value: "yes", label: "Yes, there is a written record" },
  { value: "no", label: "No, nothing was written down" },
  { value: "not-sure", label: "Not sure / I don't have that information" },
];

type Step = 1 | 2 | 3;

export default function IntakeFlow() {
  const [step, setStep] = useState<Step>(1);
  const [situation, setSituation] = useState<Situation | null>(null);

  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | null>(
    null,
  );
  const [tenure, setTenure] = useState("");
  const [formalComplaintsLodged, setFormalComplaintsLodged] = useState<
    boolean | null
  >(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const [concerns, setConcerns] = useState<ConcernCategory[]>([]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  const [whatHappened, setWhatHappened] = useState("");
  const [whatHappenedNA, setWhatHappenedNA] = useState(false);
  const [whatHappenedError, setWhatHappenedError] = useState<string | null>(null);

  const [documentationExchanged, setDocumentationExchanged] = useState("");
  const [documentationNA, setDocumentationNA] = useState(false);
  const [documentationError, setDocumentationError] = useState<string | null>(
    null,
  );

  const [employerAction, setEmployerAction] = useState("");
  const [employerActionNA, setEmployerActionNA] = useState(false);
  const [employerActionError, setEmployerActionError] = useState<string | null>(
    null,
  );

  const [requestStatus, setRequestStatus] = useState<RequestStatusAnswer | null>(null);
  const [documentationTiming, setDocumentationTiming] = useState<DocumentationTimingAnswer | null>(
    null,
  );
  const [alternativesExplored, setAlternativesExplored] = useState<AlternativesExploredAnswer | null>(
    null,
  );
  const [writtenRecord, setWrittenRecord] = useState<WrittenRecordAnswer | null>(null);
  const [dutyToAccommodateError, setDutyToAccommodateError] = useState<string | null>(null);

  function updateEmploymentStatus(value: EmploymentStatus) {
    setEmploymentStatus(value);
    setStep1Error(null);
  }

  function updateTenure(value: string) {
    setTenure(value);
    setStep1Error(null);
  }

  function updateFormalComplaintsLodged(value: boolean) {
    setFormalComplaintsLodged(value);
    setStep1Error(null);
  }

  function toggleConcern(value: ConcernCategory) {
    setConcerns((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
    setStep2Error(null);
  }

  function updateWhatHappened(value: string) {
    setWhatHappened(value);
    setWhatHappenedError(null);
  }

  function toggleWhatHappenedNA(value: boolean) {
    setWhatHappenedNA(value);
    setWhatHappenedError(null);
  }

  function updateDocumentationExchanged(value: string) {
    setDocumentationExchanged(value);
    setDocumentationError(null);
  }

  function toggleDocumentationNA(value: boolean) {
    setDocumentationNA(value);
    setDocumentationError(null);
  }

  function updateEmployerAction(value: string) {
    setEmployerAction(value);
    setEmployerActionError(null);
  }

  function toggleEmployerActionNA(value: boolean) {
    setEmployerActionNA(value);
    setEmployerActionError(null);
  }

  function updateRequestStatus(value: RequestStatusAnswer) {
    setRequestStatus(value);
    setDutyToAccommodateError(null);
  }

  function updateDocumentationTiming(value: DocumentationTimingAnswer) {
    setDocumentationTiming(value);
    setDutyToAccommodateError(null);
  }

  function updateAlternativesExplored(value: AlternativesExploredAnswer) {
    setAlternativesExplored(value);
    setDutyToAccommodateError(null);
  }

  function updateWrittenRecord(value: WrittenRecordAnswer) {
    setWrittenRecord(value);
    setDutyToAccommodateError(null);
  }

  function goToStep2() {
    const missing: string[] = [];
    if (!employmentStatus) missing.push("employment status");
    if (tenure.trim().length === 0) missing.push("length of employment");
    if (formalComplaintsLodged === null) {
      missing.push("whether formal complaints have been lodged");
    }
    if (missing.length > 0) {
      setStep1Error(`Missing: ${missing.join(", ")}.`);
      return;
    }
    setStep1Error(null);
    setStep(2);
  }

  function goToStep3() {
    const result = validateConcerns(concerns);
    if (!result.valid) {
      setStep2Error(result.message ?? null);
      return;
    }
    setStep2Error(null);
    setStep(3);
  }

  function submit() {
    const whatHappenedResult = validatePrompt(
      whatHappenedNA,
      whatHappened,
      MIN_WHAT_HAPPENED_LENGTH,
      "What happened",
    );
    const documentationResult = validatePrompt(
      documentationNA,
      documentationExchanged,
      MIN_DOCUMENTATION_LENGTH,
      "Documentation exchanged",
    );
    const employerActionResult = validatePrompt(
      employerActionNA,
      employerAction,
      MIN_EMPLOYER_ACTION_LENGTH,
      "Employer action",
    );

    setWhatHappenedError(whatHappenedResult.valid ? null : whatHappenedResult.message ?? null);
    setDocumentationError(
      documentationResult.valid ? null : documentationResult.message ?? null,
    );
    setEmployerActionError(
      employerActionResult.valid ? null : employerActionResult.message ?? null,
    );

    if (!whatHappenedResult.valid || !documentationResult.valid || !employerActionResult.valid) {
      return;
    }

    const proceduralQuestionVisibility = visibleProceduralQuestions(requestStatus);

    const missingDutyToAccommodate: string[] = [];
    if (!requestStatus) missingDutyToAccommodate.push("request status");
    if (proceduralQuestionVisibility.documentationTiming && !documentationTiming) {
      missingDutyToAccommodate.push("documentation timing");
    }
    if (!alternativesExplored) missingDutyToAccommodate.push("alternatives considered");
    if (!writtenRecord) missingDutyToAccommodate.push("written record");
    if (missingDutyToAccommodate.length > 0) {
      setDutyToAccommodateError(`Missing: ${missingDutyToAccommodate.join(", ")}.`);
      return;
    }
    setDutyToAccommodateError(null);

    if (
      !employmentStatus ||
      formalComplaintsLodged === null ||
      concerns.length === 0 ||
      !requestStatus ||
      !alternativesExplored ||
      !writtenRecord
    ) {
      // Not reachable today — steps 1 and 2 already gate progression past
      // themselves, and the check above already gates step 3's structured
      // questions. Surfaced rather than silently returning so this stays
      // safe once step-jumping or resume (Sprint 7) can reach step 3 with
      // an earlier step incomplete.
      setEmployerActionError(
        "Some required information is missing from an earlier step — go back and check Steps 1 and 2.",
      );
      return;
    }

    const facts: Situation["facts"] = [
      toFactPromptResponse(whatHappenedNA, whatHappened),
      toFactPromptResponse(documentationNA, documentationExchanged),
      toFactPromptResponse(employerActionNA, employerAction),
    ];
    const narrative = toNarrative(facts);

    const [firstConcern, ...restConcerns] = concerns;

    setSituation({
      metadata: {
        province: "BC",
        employmentStatus,
        tenure,
        formalComplaintsLodged,
        submittedAt: new Date().toISOString(),
      },
      concerns: [firstConcern, ...restConcerns],
      narrative,
      facts,
      dutyToAccommodate: {
        requestStatus,
        // Q1 is the sole conditional question (Sprint 8 requirement 19) —
        // null whenever visibleProceduralQuestions says it isn't shown,
        // regardless of any answer left over from a prior "denied"
        // selection the employer has since changed away from.
        documentationTiming: proceduralQuestionVisibility.documentationTiming
          ? documentationTiming
          : null,
        alternativesExplored,
        writtenRecord,
      },
    });
  }

  if (situation) {
    return <IntakeComplete situation={situation} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Step {step} of 3: {STEP_LABELS[step - 1]}
      </p>
      <ol className="mt-2 flex gap-2 text-xs" aria-hidden="true">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            className={`flex-1 border-t-2 pt-1 ${
              index + 1 <= step
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400"
                : "border-zinc-300 text-zinc-400 dark:border-zinc-700"
            }`}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <StepMetadata
          employmentStatus={employmentStatus}
          onEmploymentStatusChange={updateEmploymentStatus}
          tenure={tenure}
          onTenureChange={updateTenure}
          formalComplaintsLodged={formalComplaintsLodged}
          onFormalComplaintsLodgedChange={updateFormalComplaintsLodged}
          error={step1Error}
          onNext={goToStep2}
        />
      )}

      {step === 2 && (
        <StepConcerns
          concerns={concerns}
          onToggle={toggleConcern}
          error={step2Error}
          onBack={() => setStep(1)}
          onNext={goToStep3}
        />
      )}

      {step === 3 && (
        <StepNarrative
          whatHappened={whatHappened}
          onWhatHappenedChange={updateWhatHappened}
          whatHappenedNA={whatHappenedNA}
          onWhatHappenedNAChange={toggleWhatHappenedNA}
          whatHappenedError={whatHappenedError}
          documentationExchanged={documentationExchanged}
          onDocumentationExchangedChange={updateDocumentationExchanged}
          documentationNA={documentationNA}
          onDocumentationNAChange={toggleDocumentationNA}
          documentationError={documentationError}
          employerAction={employerAction}
          onEmployerActionChange={updateEmployerAction}
          employerActionNA={employerActionNA}
          onEmployerActionNAChange={toggleEmployerActionNA}
          employerActionError={employerActionError}
          requestStatus={requestStatus}
          onRequestStatusChange={updateRequestStatus}
          documentationTiming={documentationTiming}
          onDocumentationTimingChange={updateDocumentationTiming}
          alternativesExplored={alternativesExplored}
          onAlternativesExploredChange={updateAlternativesExplored}
          writtenRecord={writtenRecord}
          onWrittenRecordChange={updateWrittenRecord}
          dutyToAccommodateError={dutyToAccommodateError}
          onBack={() => setStep(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function StepMetadata({
  employmentStatus,
  onEmploymentStatusChange,
  tenure,
  onTenureChange,
  formalComplaintsLodged,
  onFormalComplaintsLodgedChange,
  error,
  onNext,
}: {
  employmentStatus: EmploymentStatus | null;
  onEmploymentStatusChange: (value: EmploymentStatus) => void;
  tenure: string;
  onTenureChange: (value: string) => void;
  formalComplaintsLodged: boolean | null;
  onFormalComplaintsLodgedChange: (value: boolean) => void;
  error: string | null;
  onNext: () => void;
}) {
  const tenureId = useId();
  const errorId = useId();
  const tenureInvalid = error !== null && tenure.trim().length === 0;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <fieldset aria-describedby={error ? errorId : undefined}>
        <legend className="font-medium text-zinc-900 dark:text-zinc-50">
          Employment status
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="employmentStatus"
                value={option.value}
                checked={employmentStatus === option.value}
                onChange={() => onEmploymentStatusChange(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={tenureId} className="font-medium text-zinc-900 dark:text-zinc-50">
          Length of employment (tenure)
        </label>
        <input
          id={tenureId}
          type="text"
          value={tenure}
          onChange={(e) => onTenureChange(e.target.value)}
          placeholder="e.g. 2 years"
          aria-invalid={tenureInvalid}
          aria-describedby={error ? errorId : undefined}
          className="mt-2 w-full rounded border border-zinc-400 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
        />
      </div>

      <fieldset aria-describedby={error ? errorId : undefined}>
        <legend className="font-medium text-zinc-900 dark:text-zinc-50">
          Have formal complaints been lodged to date, by either party?
        </legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="formalComplaintsLodged"
              checked={formalComplaintsLodged === true}
              onChange={() => onFormalComplaintsLodgedChange(true)}
            />
            Yes
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="formalComplaintsLodged"
              checked={formalComplaintsLodged === false}
              onChange={() => onFormalComplaintsLodgedChange(false)}
            />
            No
          </label>
        </div>
      </fieldset>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StepConcerns({
  concerns,
  onToggle,
  error,
  onBack,
  onNext,
}: {
  concerns: ConcernCategory[];
  onToggle: (value: ConcernCategory) => void;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const errorId = useId();
  return (
    <div className="mt-8 flex flex-col gap-6">
      <fieldset aria-describedby={error ? errorId : undefined}>
        <legend className="font-medium text-zinc-900 dark:text-zinc-50">
          What is this primarily about? Select all that apply.
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {CONCERN_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={concerns.includes(option.value)}
                onChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-zinc-400 px-4 py-2 dark:border-zinc-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function NarrativePrompt({
  label,
  value,
  onChange,
  notApplicable,
  onNotApplicableChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  notApplicable: boolean;
  onNotApplicableChange: (value: boolean) => void;
  error: string | null;
}) {
  const textareaId = useId();
  const naId = useId();
  const errorId = useId();

  return (
    <div>
      <label htmlFor={textareaId} className="font-medium text-zinc-900 dark:text-zinc-50">
        {label}
      </label>
      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        disabled={notApplicable}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 w-full rounded border border-zinc-400 px-3 py-2 disabled:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:disabled:bg-zinc-800"
      />
      <label htmlFor={naId} className="mt-2 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          id={naId}
          type="checkbox"
          checked={notApplicable}
          onChange={(e) => onNotApplicableChange(e.target.checked)}
        />
        Nothing yet / not applicable
      </label>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function RadioQuestion<T extends string>({
  name,
  legend,
  helperText,
  options,
  value,
  onChange,
  describedById,
  invalid,
}: {
  name: string;
  legend: string;
  helperText?: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Links this fieldset to a shared error message rendered elsewhere. */
  describedById?: string;
  invalid?: boolean;
}) {
  return (
    <fieldset aria-invalid={invalid} aria-describedby={describedById}>
      <legend className="font-medium text-zinc-900 dark:text-zinc-50">{legend}</legend>
      {helperText && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{helperText}</p>
      )}
      <div className="mt-2 flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StepNarrative({
  whatHappened,
  onWhatHappenedChange,
  whatHappenedNA,
  onWhatHappenedNAChange,
  whatHappenedError,
  documentationExchanged,
  onDocumentationExchangedChange,
  documentationNA,
  onDocumentationNAChange,
  documentationError,
  employerAction,
  onEmployerActionChange,
  employerActionNA,
  onEmployerActionNAChange,
  employerActionError,
  requestStatus,
  onRequestStatusChange,
  documentationTiming,
  onDocumentationTimingChange,
  alternativesExplored,
  onAlternativesExploredChange,
  writtenRecord,
  onWrittenRecordChange,
  dutyToAccommodateError,
  onBack,
  onSubmit,
}: {
  whatHappened: string;
  onWhatHappenedChange: (value: string) => void;
  whatHappenedNA: boolean;
  onWhatHappenedNAChange: (value: boolean) => void;
  whatHappenedError: string | null;
  documentationExchanged: string;
  onDocumentationExchangedChange: (value: string) => void;
  documentationNA: boolean;
  onDocumentationNAChange: (value: boolean) => void;
  documentationError: string | null;
  employerAction: string;
  onEmployerActionChange: (value: string) => void;
  employerActionNA: boolean;
  onEmployerActionNAChange: (value: boolean) => void;
  employerActionError: string | null;
  requestStatus: RequestStatusAnswer | null;
  onRequestStatusChange: (value: RequestStatusAnswer) => void;
  documentationTiming: DocumentationTimingAnswer | null;
  onDocumentationTimingChange: (value: DocumentationTimingAnswer) => void;
  alternativesExplored: AlternativesExploredAnswer | null;
  onAlternativesExploredChange: (value: AlternativesExploredAnswer) => void;
  writtenRecord: WrittenRecordAnswer | null;
  onWrittenRecordChange: (value: WrittenRecordAnswer) => void;
  dutyToAccommodateError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const dutyToAccommodateErrorId = useId();
  const proceduralQuestionVisibility = visibleProceduralQuestions(requestStatus);
  const requestStatusInvalid = dutyToAccommodateError !== null && requestStatus === null;
  const documentationTimingInvalid =
    dutyToAccommodateError !== null && documentationTiming === null;
  const alternativesExploredInvalid =
    dutyToAccommodateError !== null && alternativesExplored === null;
  const writtenRecordInvalid = dutyToAccommodateError !== null && writtenRecord === null;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <NarrativePrompt
        label="What happened, and over what timeframe?"
        value={whatHappened}
        onChange={onWhatHappenedChange}
        notApplicable={whatHappenedNA}
        onNotApplicableChange={onWhatHappenedNAChange}
        error={whatHappenedError}
      />
      <NarrativePrompt
        label="What documentation or medical information has been exchanged?"
        value={documentationExchanged}
        onChange={onDocumentationExchangedChange}
        notApplicable={documentationNA}
        onNotApplicableChange={onDocumentationNAChange}
        error={documentationError}
      />
      <NarrativePrompt
        label="What action is the employer considering, if any?"
        value={employerAction}
        onChange={onEmployerActionChange}
        notApplicable={employerActionNA}
        onNotApplicableChange={onEmployerActionNAChange}
        error={employerActionError}
      />

      <div>
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">
          A few more specific questions about the accommodation request
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          These help the checklist below say more than &ldquo;not enough
          information.&rdquo;
        </p>
      </div>

      <RadioQuestion
        name="requestStatus"
        legend="Has this employee asked for a change to their job, schedule, duties, or working conditions?"
        options={REQUEST_STATUS_OPTIONS}
        value={requestStatus}
        onChange={onRequestStatusChange}
        describedById={dutyToAccommodateError ? dutyToAccommodateErrorId : undefined}
        invalid={requestStatusInvalid}
      />

      {proceduralQuestionVisibility.documentationTiming && (
        <RadioQuestion
          name="documentationTiming"
          legend="When was medical information or a functional abilities form requested, if at all?"
          options={DOCUMENTATION_TIMING_OPTIONS}
          value={documentationTiming}
          onChange={onDocumentationTimingChange}
          describedById={dutyToAccommodateError ? dutyToAccommodateErrorId : undefined}
          invalid={documentationTimingInvalid}
        />
      )}

      <RadioQuestion
        name="alternativesExplored"
        legend="Were other options considered — such as different duties, adjusted hours, equipment, or a different location?"
        helperText="This is about what has happened so far, not whether it was the right call."
        options={ALTERNATIVES_EXPLORED_OPTIONS}
        value={alternativesExplored}
        onChange={onAlternativesExploredChange}
        describedById={dutyToAccommodateError ? dutyToAccommodateErrorId : undefined}
        invalid={alternativesExploredInvalid}
      />

      <RadioQuestion
        name="writtenRecord"
        legend="Is there a written record of how this request was assessed — for example notes, an email, or a file entry?"
        options={WRITTEN_RECORD_OPTIONS}
        value={writtenRecord}
        onChange={onWrittenRecordChange}
        describedById={dutyToAccommodateError ? dutyToAccommodateErrorId : undefined}
        invalid={writtenRecordInvalid}
      />

      {dutyToAccommodateError && (
        <p
          id={dutyToAccommodateErrorId}
          role="alert"
          className="text-sm text-red-700 dark:text-red-400"
        >
          {dutyToAccommodateError}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-zinc-400 px-4 py-2 dark:border-zinc-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          Complete intake
        </button>
      </div>
    </div>
  );
}

function labelFor<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function IntakeComplete({ situation }: { situation: Situation }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Intake complete
      </h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">
        This sprint ends here — analysis and matching are later sprints. Below
        is exactly what was captured.
      </p>

      <dl className="mt-6 flex flex-col gap-4 text-sm">
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">
            Employment status
          </dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {situation.metadata.employmentStatus}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">Tenure</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{situation.metadata.tenure}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">
            Formal complaints lodged to date
          </dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {situation.metadata.formalComplaintsLodged ? "Yes" : "No"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">Concerns</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {situation.concerns.join(", ")}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">Narrative</dt>
          <dd className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {situation.narrative || "(nothing reported)"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">Request status</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {labelFor(REQUEST_STATUS_OPTIONS, situation.dutyToAccommodate.requestStatus)}
          </dd>
        </div>
        {situation.dutyToAccommodate.documentationTiming && (
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Documentation timing
            </dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              {labelFor(
                DOCUMENTATION_TIMING_OPTIONS,
                situation.dutyToAccommodate.documentationTiming,
              )}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">
            Alternatives explored
          </dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {labelFor(ALTERNATIVES_EXPLORED_OPTIONS, situation.dutyToAccommodate.alternativesExplored)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-900 dark:text-zinc-50">Written record</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">
            {labelFor(WRITTEN_RECORD_OPTIONS, situation.dutyToAccommodate.writtenRecord)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
