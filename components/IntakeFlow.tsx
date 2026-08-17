"use client";

import { useId, useState } from "react";
import type {
  ConcernCategory,
  EmploymentStatus,
  Situation,
} from "@/lib/types";
import {
  MIN_DOCUMENTATION_LENGTH,
  MIN_EMPLOYER_ACTION_LENGTH,
  MIN_WHAT_HAPPENED_LENGTH,
  toFactPromptResponse,
  toNarrative,
  validateConcerns,
  validatePrompt,
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

    if (
      !employmentStatus ||
      formalComplaintsLodged === null ||
      concerns.length === 0
    ) {
      // Not reachable today — steps 1 and 2 already gate progression past
      // themselves. Surfaced rather than silently returning so this stays
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
  onBack: () => void;
  onSubmit: () => void;
}) {
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
      </dl>
    </div>
  );
}
