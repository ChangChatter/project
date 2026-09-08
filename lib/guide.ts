// Extracted from the HTML design prototype (BC Employer Issue Guide.dc.html).
// Pure data + logic — no UI. Drop this in as-is and import from your route components.
//
// Types are declared at the bottom; the data blocks below are verbatim from the
// prototype so the copy stays identical to what was designed and reviewed.

export const CONCERNS = [
  {id:'accom', label:'A request tied to health', desc:'Disability, injury or illness — modified duties, leave, equipment or hours.'},
  {id:'family', label:'Pregnancy, leave or family status', desc:'Leave entitlement, returning to work, childcare or eldercare duties.'},
  {id:'race', label:'Race, ancestry, origin or religion', desc:'Comments, exclusion, or being treated differently because of who they are.'},
  {id:'age', label:'Age', desc:'Restructuring, retirement conversations, or age-linked remarks.'},
  {id:'sex', label:'Sex, orientation or gender identity', desc:'Includes names and pronouns, dress codes, and sexual harassment.'},
  {id:'conduct', label:'Conflict or bullying between staff', desc:'A conduct complaint with no protected ground named yet.'},
  {id:'disc', label:'Discipline, performance or termination', desc:'A decision has been made, or you are thinking about one.'},
  {id:'retal', label:'Treatment changed after they spoke up', desc:'Something shifted once they raised a concern or asked a question.'}
];

export const FACTORS = [
  {id:'note', label:'A medical note was provided'},
  {id:'written', label:'The request came in writing'},
  {id:'leave', label:'They are on leave right now'},
  {id:'recent', label:'Discipline issued in the last 60 days'},
  {id:'multi', label:'More than one person has complained'},
  {id:'mgr', label:'Their manager is the person complained about'},
  {id:'union', label:'A collective agreement applies'},
  {id:'ext', label:'They have raised it outside the company'}
];

export const PROMPTS = [
  {t:'When you first heard about it, and from whom'},
  {t:'What was said or done, as close to the words as you can get'},
  {t:'Anything already put in writing — emails, notes, letters'},
  {t:'Who else was present or knows'},
  {t:'What you have done in response so far'}
];

export const PATHS = {
  accom: {
    key:'accom',
    title:'Run a proper accommodation process before making any other decision',
    lede:'This is one of the most common situations employers face, and it is very workable. What matters here is not getting the answer perfect — it is showing that you asked, considered the options, and wrote it down.',
    steps:[
      {w:'Within 3 days', t:'Acknowledge it in writing', d:'A short note saying you received the request and are looking at options is enough. Silence is what causes problems later.'},
      {w:'Within a week', t:'Ask what they can and cannot do — not for a diagnosis', d:'You are entitled to know their functional limitations and roughly how long they will last. You are not entitled to their medical file.'},
      {w:'Within two weeks', t:'Meet and list the options together', d:'Write down every option you considered, including the ones you ruled out, and the reason why. This record is the single most useful thing you can create.'},
      {w:'Then ongoing', t:'Confirm what you agree in writing, and set a review date', d:'Arrangements drift. A calendar check-in in six or eight weeks keeps it current and shows good faith.'}
    ],
    frameworks:[
      {n:'Duty to accommodate', s:'Human Rights Code s. 13', t:'Clearly engaged. A request connected to a disability triggers both a procedural duty (to explore options) and a substantive one (to accommodate short of undue hardship).'},
      {n:'Constructive dismissal', s:'Common law', t:'Worth watching. Changing pay, hours or duties without agreement — even helpfully — can be treated as a fundamental breach of the contract.'}
    ],
    docs:[
      {t:'The written request, and any medical notes you have received'},
      {t:'The job description, with the genuinely essential duties marked'},
      {t:'Dated notes from every accommodation conversation'},
      {t:'The list of options considered, and why each was accepted or ruled out'},
      {t:'Cost or scheduling evidence, if hardship may become the argument'}
    ],
    cautions:[
      {t:'Do not ask for a diagnosis or their full medical records.'},
      {t:'Do not finalise a termination or restructuring while a request is open.'},
      {t:'Do not treat one rejected option as the end of the conversation.'}
    ],
    deadlines:['hrt','internal','records']
  },
  family: {
    key:'family',
    title:'Confirm the leave entitlement first, then plan the return in writing',
    lede:'Leave and family-status matters usually go wrong on the return, not the departure. Getting the entitlement confirmed now, and the return planned in writing, resolves most of the risk.',
    steps:[
      {w:'This week', t:'Confirm which statutory leave applies, and its length', d:'Pregnancy, parental, family responsibility and compassionate care leaves each have their own rules under the Employment Standards Act. Put your reading of it in writing to them.'},
      {w:'Before the leave', t:'Write down the return arrangement', d:'Same role, same pay, same location unless they agree otherwise. Say so explicitly so nobody is guessing months later.'},
      {w:'During', t:'Keep benefits and service accruing', d:'Service continues through statutory leave. Check that payroll and benefits have been set up to reflect that.'},
      {w:'Two weeks before return', t:'Have a return conversation, and record it', d:'If duties or schedule need to change, that is a negotiation — not an announcement.'}
    ],
    frameworks:[
      {n:'Statutory leave entitlement', s:'Employment Standards Act ss. 50–56', t:'Engaged. Length, notice and reinstatement rights are set by statute and cannot be contracted below.'},
      {n:'Family status discrimination', s:'Human Rights Code s. 13', t:'Engaged if a caregiving obligation is being treated as a scheduling inconvenience rather than accommodated.'}
    ],
    docs:[
      {t:'The leave request and any notice given'},
      {t:'Your written confirmation of leave type, dates and return terms'},
      {t:'Payroll and benefit continuation records for the leave period'},
      {t:'Notes from the return-to-work conversation'},
      {t:'Any scheduling or childcare constraint they have told you about'}
    ],
    cautions:[
      {t:'Do not fill their role permanently without legal advice.'},
      {t:'Do not treat a caregiving constraint as an availability problem.'},
      {t:'Do not change duties or pay on return without written agreement.'}
    ],
    deadlines:['hrt','esa','internal']
  },
  code: {
    key:'code',
    title:'Investigate it properly, and keep the decision-makers separate',
    lede:'When a complaint touches a protected ground, a fair and reasonably prompt investigation is your strongest position — regardless of what it concludes. The most common mistake is having the wrong person run it.',
    steps:[
      {w:'Within 2 days', t:'Acknowledge the complaint and say what happens next', d:'Set out the process in a short note: who will look into it, roughly how long, and that no reprisal will follow.'},
      {w:'Within a week', t:'Appoint someone with no stake in the outcome', d:'Not the person complained about, and not their direct manager. If nobody internal is genuinely neutral, use an external investigator.'},
      {w:'Within two weeks', t:'Interview both sides and any witnesses, and take notes', d:'Give the respondent the allegations in enough detail to answer them. Interview separately, and keep notes contemporaneous.'},
      {w:'Within 30 days', t:'Reach a finding and write it down', d:'State the allegation, the evidence, the finding and the remedy. Share the outcome with both parties, even briefly.'}
    ],
    frameworks:[
      {n:'Discrimination in employment', s:'Human Rights Code s. 13', t:'Engaged. The complainant needs to show a protected characteristic, an adverse impact, and a connection between the two.'},
      {n:'Retaliation', s:'Human Rights Code s. 43', t:'Live from now on. Any adverse change after a complaint can found a separate claim, even if the original complaint fails.'}
    ],
    docs:[
      {t:'The complaint as received, dated'},
      {t:'Your written acknowledgement and process description'},
      {t:'Interview notes for every person spoken to'},
      {t:'Relevant emails, messages, schedules or performance records'},
      {t:'The investigation report and the outcome letters to both parties'}
    ],
    cautions:[
      {t:'Do not let the person complained about run or shape the investigation.'},
      {t:'Do not promise the complainant confidentiality you cannot deliver.'},
      {t:'Do not make any change to their role, hours or pay while this is open.'}
    ],
    deadlines:['hrt','internal','records']
  },
  conduct: {
    key:'conduct',
    title:'Treat it as a workplace health obligation, not just a personality clash',
    lede:'Bullying and harassment sit under occupational health and safety in British Columbia, which means you have a duty to respond whether or not anyone has used legal language. A documented response resolves most of these.',
    steps:[
      {w:'Within 2 days', t:'Check your policy against what you are actually doing', d:'WorkSafeBC expects a written policy, a reporting procedure, and a documented response. If the policy exists but nobody followed it, note that now.'},
      {w:'Within a week', t:'Take the report properly and separate the parties if needed', d:'Separation is a precaution, not a punishment — and it should not disadvantage the person who reported.'},
      {w:'Within two weeks', t:'Look into it and keep contemporaneous notes', d:'Even for a modest matter, a short written record of who you spoke to and what you concluded is what demonstrates compliance.'},
      {w:'Within 30 days', t:'Close it out and tell both people the outcome', d:'Then check back in a month. Unresolved conduct matters tend to reappear as human rights complaints.'}
    ],
    frameworks:[
      {n:'Bullying and harassment duties', s:'Workers Compensation Act — OHS policy D3-115-2', t:'Engaged. You must have a policy, take reasonable steps to prevent it, and respond to reports.'},
      {n:'Discrimination', s:'Human Rights Code s. 13', t:'Possible. If any of the conduct is tied to a protected characteristic, the matter also becomes a Code issue — ask, do not assume.'}
    ],
    docs:[
      {t:'Your current bullying and harassment policy, and proof of training'},
      {t:'The report as it came in, dated'},
      {t:'Notes of each conversation and the steps you took'},
      {t:'Any messages, schedules or witness accounts'},
      {t:'The outcome record and the follow-up check-in'}
    ],
    cautions:[
      {t:'Do not describe it as a personality clash in writing before looking into it.'},
      {t:'Do not move or reschedule the person who reported it.'},
      {t:'Do not skip the written record because the matter seems small.'}
    ],
    deadlines:['wcb','internal','hrt']
  },
  disc: {
    key:'disc',
    title:'Pause the decision and build the record before you act',
    lede:'A termination or discipline decision is much easier to defend when the record was built before the decision, not after it. A short pause now is almost always cheaper than the alternative.',
    steps:[
      {w:'Today', t:'Hold the decision', d:'If anything protected has been raised — health, leave, a complaint — acting now invites a retaliation claim even if your reasons are entirely sound.'},
      {w:'This week', t:'Assemble the performance record as it actually exists', d:'Dated warnings, expectations set, support offered, and whether they were told their job was at risk. Gaps matter more than severity.'},
      {w:'This week', t:'Work out what is owed on a without-cause basis', d:'Statutory notice under the Employment Standards Act is the floor, not the answer; common-law reasonable notice is usually more. Price both.'},
      {w:'Before acting', t:'Get 30 minutes of legal advice', d:'For a decision of this size, a short review of the record and the number is the highest-value spend available to you.'}
    ],
    frameworks:[
      {n:'Notice on termination', s:'Employment Standards Act s. 63', t:'Engaged. Statutory minimum notice or pay accrues with service; the contract or common law may require considerably more.'},
      {n:'Just cause', s:'Common law', t:'A high bar. Progressive discipline, clear warnings and a documented final chance are what make cause arguable at all.'}
    ],
    docs:[
      {t:'The full personnel file, in date order'},
      {t:'Every warning and performance conversation, with dates'},
      {t:'The employment contract, and any termination clause in it'},
      {t:'Payroll records: wages, vacation pay, bonus and commission terms'},
      {t:'Anything the employee has raised in the last six months'}
    ],
    cautions:[
      {t:'Do not build or backdate documentation after the decision.'},
      {t:'Do not terminate while a complaint, leave or accommodation request is live.'},
      {t:'Do not ask them to sign a release on the spot without time to consider it.'}
    ],
    deadlines:['esa','hrt','records']
  },
  retal: {
    key:'retal',
    title:'Freeze the change and separate the decision from the complaint',
    lede:'Retaliation is a standalone claim in British Columbia, and it can succeed even where the original complaint does not. The good news is that it is the easiest exposure to fix — usually by undoing one recent change.',
    steps:[
      {w:'Today', t:'Reverse or pause the change that followed the complaint', d:'Schedule, duties, pay, shift, reporting line — put it back to where it was while you work out what happened.'},
      {w:'This week', t:'Establish when the decision was actually made, and by whom', d:'If the decision genuinely predates the complaint, find the contemporaneous evidence now: emails, plans, budget notes.'},
      {w:'This week', t:'Take the decision away from anyone named in the complaint', d:'Even a well-founded decision looks like reprisal if the person complained about signed it off.'},
      {w:'Within two weeks', t:'Tell the employee in writing that no reprisal will follow', d:'Then make sure that is true, including in informal ways — meeting invitations, shift allocation, tone.'}
    ],
    frameworks:[
      {n:'Retaliation', s:'Human Rights Code s. 43', t:'Directly engaged. It protects anyone who makes a complaint, is named in one, or gives evidence — and it does not require the underlying complaint to succeed.'},
      {n:'Employment standards reprisal', s:'Employment Standards Act s. 83', t:'Engaged if what they raised concerned wages, hours or leave rather than a protected characteristic.'}
    ],
    docs:[
      {t:'A timeline of the complaint and every change that followed it'},
      {t:'Evidence of when the decision was made — dated emails, plans, approvals'},
      {t:'Who was involved in the decision, and their connection to the complaint'},
      {t:'Schedule, pay and duty records before and after'},
      {t:'Your written no-reprisal assurance'}
    ],
    cautions:[
      {t:'Do not have anyone named in the complaint decide anything about the complainant.'},
      {t:'Do not reduce hours, shifts or duties while this is unresolved.'},
      {t:'Do not discuss the complaint with colleagues who have no need to know.'}
    ],
    deadlines:['hrt','esa','internal']
  }
};

export const CONCERN_TO_PATH: Record<ConcernId, PathId> = {accom:'accom', family:'family', race:'code', age:'code', sex:'code', conduct:'conduct', disc:'disc', retal:'retal'};

export const STEP_META = [
  {num:'01', roman:'I', label:'Context', title:'Where things stand', blurb:'These answers tell us which routes are open and which clocks may already be running. Estimates are fine.'},
  {num:'02', roman:'II', label:'Concern', title:'What the concern is', blurb:'We ask for their framing first, then yours. Both change the recommendation.'},
  {num:'03', roman:'III', label:'Narrative', title:'What happened', blurb:'Your account in plain words. This is what sets the timeline and the document list.'}
];

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface Concern { id: ConcernId; label: string; desc: string; }
export type ConcernId =
  | 'accom' | 'family' | 'race' | 'age' | 'sex' | 'conduct' | 'disc' | 'retal';
export type PathId = 'accom' | 'family' | 'code' | 'conduct' | 'disc' | 'retal';
export type FactorId =
  | 'note' | 'written' | 'leave' | 'recent' | 'multi' | 'mgr' | 'union' | 'ext';
export type DeadlineKey = 'hrt' | 'esa' | 'wcb' | 'internal' | 'records';

export interface PathStep { w: string; t: string; d: string; }
export interface Framework { n: string; s: string; t: string; }
export interface Bullet { t: string; }

export interface GuidePath {
  key: string;
  title: string;
  lede: string;
  steps: PathStep[];
  frameworks: Framework[];
  docs: Bullet[];
  cautions: Bullet[];
  deadlines: DeadlineKey[];
}

export interface DeadlineRow {
  matter: string;
  forum: string;
  window: string;
  runs: string;
}

export interface Answers {
  status: '' | 'Active' | 'Suspended' | 'Terminated';
  tenure: string;
  tenureUnit: 'years' | 'months';
  complaints: '' | 'Yes' | 'No';
  concern: ConcernId | '';
  factors: FactorId[];
  narrative: string;
  /** ISO yyyy-mm-dd from an <input type="date"> */
  incident: string;
  goal: string;
}

export const EMPTY_ANSWERS: Answers = {
  status: '', tenure: '', tenureUnit: 'years', complaints: '',
  concern: '', factors: [], narrative: '', incident: '',
  goal: 'Resolve it internally',
};

/* ── Date helpers ──────────────────────────────────────────────────────── */

const fmt = (d: Date) =>
  d.toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' });

/** Parsed at noon local time so DST shifts can never roll the date back a day. */
function incidentDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

export function monthsFromIncident(iso: string, months: number): string {
  const d = incidentDate(iso);
  if (!d) return 'set an incident date';
  d.setMonth(d.getMonth() + months);
  return fmt(d);
}

export function businessDaysFromIncident(iso: string, n: number): string {
  const d = incidentDate(iso);
  if (!d) return 'begin now';
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) left--;
  }
  return fmt(d);
}

/* ── Deadlines ─────────────────────────────────────────────────────────── */

export function deadlineRow(key: DeadlineKey, a: Answers): DeadlineRow {
  const terminated = a.status === 'Terminated';
  switch (key) {
    case 'hrt':
      return {
        matter: 'Human rights complaint',
        forum: 'BC Human Rights Tribunal',
        window: '1 year from the last incident',
        runs: monthsFromIncident(a.incident, 12),
      };
    case 'esa':
      return {
        matter: 'Employment standards complaint',
        forum: 'Employment Standards Branch',
        window: terminated
          ? '6 months from the last day worked'
          : '6 months from the contravention',
        runs: monthsFromIncident(a.incident, 6),
      };
    case 'wcb':
      return {
        matter: 'Bullying and harassment response',
        forum: 'WorkSafeBC (OHS)',
        window: 'No fixed period — response must be reasonably prompt',
        runs: 'act now',
      };
    case 'internal':
      return {
        matter: 'Your own investigation',
        forum: 'Internal',
        window: 'Best practice: begin within 5 business days',
        runs: businessDaysFromIncident(a.incident, 5),
      };
    case 'records':
      return {
        matter: 'Payroll record retention',
        forum: 'Employment Standards Act',
        window: '4 years from the record being made',
        runs: 'ongoing duty',
      };
  }
}

/* ── The recommendation ────────────────────────────────────────────────── */

export interface Recommendation {
  title: string;
  lede: string;
  /** Zero-padded ordinals ("01", "02", …) as displayed in the design. */
  steps: (PathStep & { n: string })[];
  frameworks: Framework[];
  docs: Bullet[];
  cautions: Bullet[];
  deadlines: DeadlineRow[];
}

export function recommend(a: Answers): Recommendation {
  const path: GuidePath =
    (PATHS as Record<string, GuidePath>)[CONCERN_TO_PATH[a.concern as ConcernId]] ??
    (PATHS as Record<string, GuidePath>).code;
  const f = new Set(a.factors);

  const cautions = [...path.cautions];
  if (f.has('mgr') && path.key !== 'code')
    cautions.push({ t: 'Do not route this through the manager who is named — appoint someone neutral.' });
  if (f.has('union'))
    cautions.push({ t: 'Do not act before checking the collective agreement — grievance timelines may be shorter.' });
  if (f.has('ext'))
    cautions.push({ t: 'Do not contact the external body or their representative without legal advice.' });

  const docs = [...path.docs];
  if (f.has('multi'))
    docs.push({ t: 'Each complaint separately, plus any pattern across them' });
  if (f.has('recent'))
    docs.push({ t: 'The discipline issued in the last 60 days, and what prompted it' });

  const frameworks = [...path.frameworks];
  if (a.complaints === 'Yes')
    frameworks.push({
      n: 'A filing is already in play',
      s: 'Procedure',
      t: 'Because something has been formally lodged, treat all internal notes from this point as potentially disclosable, and route new documents through counsel.',
    });

  return {
    title: path.title,
    lede: path.lede,
    steps: path.steps.map((x, i) => ({ ...x, n: String(i + 1).padStart(2, '0') })),
    frameworks,
    docs,
    cautions,
    deadlines: path.deadlines.map((k) => deadlineRow(k, a)),
  };
}

/* ── Validation (gates the Continue button) ────────────────────────────── */

/** Which of the six questions belongs to which pass. */
export const STEP_OF: Record<number, 1 | 2 | 3> =
  { 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3 };

export function questionValid(n: number, a: Answers): boolean {
  switch (n) {
    case 1: return !!a.status;
    case 2: return Number(a.tenure) > 0;
    case 3: return !!a.complaints;
    case 4: return !!a.concern;
    case 5: return true;                                  // factors are optional
    case 6: return a.narrative.trim().length >= 60;
    default: return true;
  }
}

const MISSING_LABEL: Record<number, string> = {
  1: 'employment status',
  2: 'tenure',
  3: 'whether anything has been lodged',
  4: 'the concern',
  6: 'a little more of the narrative',
};

/** Returns '' when the pass is complete, otherwise the note shown by the button. */
export function missingNote(step: 1 | 2 | 3, a: Answers): string {
  const bad = [1, 2, 3, 4, 5, 6]
    .filter((n) => STEP_OF[n] === step && !questionValid(n, a));
  if (!bad.length) return '';
  return 'Still needed: ' +
    bad.map((n) => MISSING_LABEL[n]).filter(Boolean).join(', ');
}
