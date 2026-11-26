"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import CompanyLogo from "./CompanyLogo";
import RoleDetails from "./RoleDetails";
import { postingFacts, postingSections, type PostingFact, type PostingSection } from "@/lib/postingFacts";
import { keywordMatch } from "@/lib/keywords";
import { skillsMentioned } from "@/lib/jobFacts";
import { bumpUsage } from "@/lib/usage";
import { trustOf } from "@/lib/authenticity";
import { similarJobs } from "@/lib/similar";
import { PriorityBreakdown, ReadinessCard } from "./ReadinessCard";
import { KEYS, useStored, type Report } from "@/lib/prefs";
import { EMAIL_TYPES, type NextStepsPlan, type Profile, type ScoredJob } from "@/lib/types";
import { apiFetch, readJSON } from "@/lib/api";

type Props = {
  job: ScoredJob;
  profile: Profile;
  allJobs: ScoredJob[];
  tracked: boolean;
  onSave: (job: ScoredJob, plan?: NextStepsPlan) => void;
  onOpenSaved: (id: string) => void;
  onTailor: (job: ScoredJob) => void;
  onOpenJob: (job: ScoredJob) => void;
  onClose: () => void;
  compared?: boolean;
  onCompare?: () => void;
  onHide?: () => void;
};

type Live = { status: "loading" | "open" | "closed" | "unknown" | "error"; checkedAt?: string };

// Plans written for jobs the student hasn't saved yet, kept for this visit so
// reopening a job doesn't spend another AI request.
const planCache = new Map<string, NextStepsPlan>();
const PLAN_KEY = "internagent.previewPlans";
function readPlans(): Record<string, NextStepsPlan> {
  try { return JSON.parse(sessionStorage.getItem(PLAN_KEY) || "{}"); } catch { return {}; }
}
function storePlan(id: string, plan: NextStepsPlan) {
  planCache.set(id, plan);
  try { sessionStorage.setItem(PLAN_KEY, JSON.stringify({ ...readPlans(), [id]: plan })); } catch {}
}

function ago(iso?: string) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

const SECTION_LABEL: Record<PostingSection["kind"], string> = {
  role: "What you'd do",
  requirements: "What they require",
  preferred: "Nice to have",
  benefits: "Pay and benefits",
  about: "About the company",
  other: "More details",
};

export default function InternshipDetail({ job: listed, profile, allJobs, tracked, onSave, onOpenSaved, onTailor, onOpenJob, onClose, compared, onCompare, onHide }: Props) {
  const [job, setJob] = useState<ScoredJob>(listed);
  const [live, setLive] = useState<Live>({ status: listed.source === "simplify" ? "unknown" : "loading" });
  const [explain, setExplain] = useState(false);
  const [watch, setWatch] = useStored<string[]>(KEYS.watch, []);
  const watching = watch.includes(listed.company);
  const dialog = useRef<HTMLDivElement>(null);
  useFocusTrap(dialog);

  // Fetch the full, current posting from the company's own job board.
  useEffect(() => {
    setJob(listed);
    setExplain(false);
    dialog.current?.scrollTo({ top: 0 });
    if (listed.source === "simplify" || listed.custom) { setLive({ status: "unknown" }); return; }
    let cancelled = false;
    setLive({ status: "loading" });
    apiFetch(`/api/job?id=${encodeURIComponent(listed.id)}`)
      .then((r) => readJSON(r))
      .then((d) => {
        if (cancelled) return;
        if (d.status === "open" && d.job) setJob({ ...listed, ...d.job, fit: listed.fit });
        setLive({ status: d.status === "open" || d.status === "closed" ? d.status : d.error ? "error" : "unknown", checkedAt: d.checkedAt });
      })
      .catch(() => !cancelled && setLive({ status: "error" }));
    return () => { cancelled = true; };
  }, [listed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    dialog.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const facts = useMemo(() => postingFacts(job), [job]);
  const trust = useMemo(() => trustOf(job), [job]);
  const sections = useMemo(() => postingSections(job.description), [job.description]);
  const km = useMemo(() => keywordMatch(job, profile), [job, profile]);
  const mine = useMemo(() => skillsMentioned(job, profile.skills, 10), [job, profile.skills]);
  const more = useMemo(
    () => allJobs.filter((j) => j.company === job.company && j.id !== job.id).slice(0, 6),
    [allJobs, job.company, job.id],
  );
  const similar = useMemo(() => similarJobs(job, allJobs), [job, allJobs]);
  const deadline = job.deadline?.slice(0, 10);

  const main = sections.filter((s) => s.kind === "role" || s.kind === "requirements" || s.kind === "preferred");
  const rest = sections.filter((s) => !main.includes(s));

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="internship-title"
        className="animate-pop-in w-full max-w-3xl overflow-hidden rounded-3xl bg-surface shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <CompanyLogo company={job.company} url={job.url} size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700">{job.company}{job.team ? <span className="font-normal text-slate-500"> · {job.team}</span> : null}</p>
              <h2 id="internship-title" className="mt-0.5 text-xl font-medium leading-snug text-slate-900 sm:text-2xl">{job.title}</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {job.postedAt && <span>Posted or updated {ago(job.postedAt)}</span>}
                <LiveBadge live={live} source={job.source} />
              </p>
              <p className="mt-1.5 text-xs">
                <span className={`tag ${trust.level === "suspicious" ? "border-rose-400 bg-rose-50 text-rose-700" : trust.level === "official" ? "tag-accent" : "tag-soft"}`}>{trust.level === "suspicious" ? "⚠ " : trust.level === "official" ? "✓ " : ""}{trust.label}</span>{" "}
                <span className="text-slate-500">{trust.detail}</span>
              </p>
            </div>
            <button onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={job.url} target="_blank" rel="noreferrer" className="btn-primary px-4 py-2">Apply on {job.source === "simplify" ? "the posting" : `${job.company}'s site`} ↗</a>
            {tracked ? (
              <button onClick={() => onOpenSaved(job.id)} className="btn-secondary border-emerald-300 bg-emerald-50 text-emerald-700">✓ Saved · open in Applications</button>
            ) : (
              <button onClick={() => onSave(job, planCache.get(job.id))} className="btn-secondary">＋ Save to Applications</button>
            )}
            <button onClick={() => onTailor(job)} className="btn-secondary">✍️ Tailor my resume</button>
            <button onClick={() => setWatch((w) => (w.includes(job.company) ? w.filter((c) => c !== job.company) : [...w, job.company].slice(-30)))} aria-pressed={watching} className="btn-secondary" title="Get a notification when this company posts new internships">{watching ? `★ Watching ${job.company}` : `☆ Watch ${job.company}`}</button>
            {onCompare && <button onClick={onCompare} aria-pressed={!!compared} className="btn-secondary">{compared ? "✓ In comparison" : "⇄ Compare"}</button>}
          </div>
          {trust.flags.length > 0 && (
            <div role="alert" className="mt-4 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
              <p className="font-semibold">Be careful with this listing</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {trust.flags.map((f) => <li key={f.label}>{f.label}{f.quote ? <span className="block text-xs italic text-rose-800/80">“{f.quote}”</span> : null}</li>)}
              </ul>
              <p className="mt-1.5 text-xs">Real employers don&apos;t charge you to apply or ask for bank details before an offer. If unsure, find the role on the company&apos;s own careers page.</p>
            </div>
          )}
        </div>

        <div className="space-y-8 p-5">
          {/* Key facts */}
          <section aria-labelledby="facts-h">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id="facts-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Key facts</h3>
              <span className="hidden text-[11px] text-slate-400 sm:inline">Read from the posting · tap one to see where</span>
            </div>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {facts.map((f) => <Fact key={f.key} f={f} />)}
            </dl>
            {facts.length <= 2 && (
              <p className="mt-2 text-sm text-slate-500">This listing doesn&apos;t say much. Open the posting for dates, pay and requirements before you apply.</p>
            )}
          </section>

          {/* Should you apply? */}
          <section aria-labelledby="apply-h" className="space-y-2">
            <h3 id="apply-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Should you apply, and are you ready?</h3>
            <PriorityBreakdown job={job} profile={profile} />
            <ReadinessCard job={job} profile={profile} />
          </section>

          {/* Next steps */}
          <section aria-labelledby="steps-h">
            <h3 id="steps-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your next steps for this internship</h3>
            {tracked ? (
              <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-slate-700">
                You saved this one. Your checklist, emails, cover letter and interview prep are in Applications.{" "}
                <button onClick={() => onOpenSaved(job.id)} className="font-medium text-blue-700 underline underline-offset-2">Open my plan</button>
              </div>
            ) : (
              <PreviewSteps job={job} profile={profile} deadline={deadline} matched={job.fit?.matched || km?.matched} missing={job.fit?.missing || km?.missing}
                onSave={(plan) => onSave(job, plan)} />
            )}
          </section>

          {/* Match */}
          <section aria-labelledby="match-h">
            <h3 id="match-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">How you match</h3>
            <div className="mt-2 space-y-3 text-sm">
              {job.fit && (
                <div className="border-l-2 border-blue-500 pl-3">
                  <p className="font-medium text-slate-900">AI fit score: {job.fit.score}/100</p>
                  <p className="mt-0.5 text-slate-700">{job.fit.reason}</p>
                </div>
              )}
              {km ? (
                <div>
                  <p className="text-slate-700">Keyword match <b>{km.pct}%</b>: the posting names {km.matched.length + km.missing.length} hard skills and your resume shows {km.matched.length}.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {km.matched.map((m) => <span key={m} className="chip bg-emerald-100/70 text-emerald-800">✓ {m}</span>)}
                    {km.missing.map((m) => <span key={m} className="chip bg-slate-100 text-slate-600">{m}</span>)}
                  </div>
                </div>
              ) : mine.length ? (
                <p className="text-slate-700">The posting mentions your skills: {mine.join(", ")}.</p>
              ) : (
                <p className="text-slate-500">The posting doesn&apos;t list enough specific skills to compare. Use <b className="font-medium">Score with AI</b> in the search, or Tailor, for a closer look.</p>
              )}
            </div>
          </section>

          {/* From the posting */}
          <section aria-labelledby="posting-h">
            <h3 id="posting-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">From the posting</h3>
            {live.status === "loading" && sections.length < 2 && <div className="mt-2 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-3.5 w-11/12" />)}</div>}
            {main.length ? (
              <div className="mt-2 space-y-5">
                {main.map((s, i) => <Section key={i} s={s} />)}
              </div>
            ) : sections.length === 0 && live.status !== "loading" ? (
              <p className="mt-2 text-sm text-slate-500">This listing has no description. Open the posting, or use the plain-English explanation below.</p>
            ) : null}
            {rest.length > 0 && (
              <details className="mt-4 rounded-md border border-slate-200 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">{main.length ? "Read the rest of the posting" : "Read the posting"}</summary>
                <div className="mt-3 space-y-5 pb-1">{rest.map((s, i) => <Section key={i} s={s} />)}</div>
              </details>
            )}
          </section>

          {/* Plain-English explanation (AI, on demand) */}
          <section aria-labelledby="explain-h">
            <h3 id="explain-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">In plain English</h3>
            {explain ? (
              <RoleDetails job={job} />
            ) : (
              <button onClick={() => setExplain(true)} className="btn-secondary mt-2">Explain this role and company</button>
            )}
          </section>

          <Feedback job={job} onHide={onHide} />

          {more.length > 0 && (
            <section aria-labelledby="more-h">
              <h3 id="more-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">More internships at {job.company}</h3>
              <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
                {more.map((j) => (
                  <li key={j.id}>
                    <button onClick={() => onOpenJob(j)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50">
                      <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{j.title}</span><span className="block truncate text-xs text-slate-500">{j.location}</span></span>
                      <span aria-hidden className="text-slate-400">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {similar.length > 0 && (
            <section aria-labelledby="similar-h">
              <h3 id="similar-h" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Similar internships at other companies</h3>
              <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
                {similar.map((j) => (
                  <li key={j.id}>
                    <button onClick={() => onOpenJob(j)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50">
                      <span className="min-w-0"><span className="block truncate font-medium text-slate-800">{j.title}</span><span className="block truncate text-xs text-slate-500">{j.company} · {j.location}</span></span>
                      <span aria-hidden className="text-slate-400">→</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-slate-500">Matched by the words in the role&apos;s title, one per company.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveBadge({ live, source }: { live: Live; source: ScoredJob["source"] }) {
  if (live.status === "loading") return <span>· Checking it&apos;s still open…</span>;
  if (live.status === "open") return <span className="font-medium text-emerald-700">· ✓ Still open on the company&apos;s job board (checked just now)</span>;
  if (live.status === "closed") return <span className="font-medium text-rose-700">· No longer listed on the company&apos;s job board. It may have closed.</span>;
  if (source === "simplify") return <span>· From the SimplifyJobs list. Check the posting to confirm it&apos;s open.</span>;
  return null;
}

function Fact({ f }: { f: PostingFact }) {
  const [open, setOpen] = useState(false);
  const tone = f.tone === "good" ? "border-emerald-200 bg-emerald-50/50" : f.tone === "warn" ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-surface";
  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <button
        type="button"
        onClick={() => f.quote && setOpen((o) => !o)}
        aria-expanded={f.quote ? open : undefined}
        className={`w-full text-left ${f.quote ? "cursor-pointer" : "cursor-default"}`}
      >
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.icon} {f.label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-900">{f.value}</dd>
      </button>
      {open && f.quote && <p className="mt-1.5 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-600">“{f.quote}”</p>}
    </div>
  );
}

function Section({ s }: { s: PostingSection }) {
  const [all, setAll] = useState(false);
  const items = all ? s.items : s.items.slice(0, 8);
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">
        {SECTION_LABEL[s.kind]}
        {s.heading && s.heading.toLowerCase() !== SECTION_LABEL[s.kind].toLowerCase() && <span className="font-normal text-slate-500"> · {s.heading}</span>}
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
            <span className={`mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full ${s.kind === "requirements" ? "bg-blue-500" : s.kind === "preferred" ? "bg-slate-300" : "bg-slate-400"}`} />
            {it}
          </li>
        ))}
      </ul>
      {s.items.length > 8 && (
        <button onClick={() => setAll((a) => !a)} className="mt-1 text-xs font-medium text-blue-700 underline underline-offset-2">
          {all ? "Show less" : `Show ${s.items.length - 8} more`}
        </button>
      )}
    </div>
  );
}

function PreviewSteps({ job, profile, deadline, matched, missing, onSave }: {
  job: ScoredJob; profile: Profile; deadline?: string; matched?: string[]; missing?: string[]; onSave: (plan: NextStepsPlan) => void;
}) {
  const [plan, setPlan] = useState<NextStepsPlan | null>(() => planCache.get(job.id) || readPlans()[job.id] || null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const done = new Set(plan?.done || []);

  useEffect(() => {
    const cached = planCache.get(job.id) || readPlans()[job.id];
    if (cached && attempt === 0) { setPlan(cached); planCache.set(job.id, cached); return; }
    let cancelled = false;
    setPlan(null);
    setError("");
    apiFetch("/api/next-steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        opportunity: { title: job.title, company: job.company, location: job.location, url: job.url, description: job.description, status: "saved", matched, missing, deadline },
      }),
    })
      .then(async (r) => { const d = await readJSON(r); if (!r.ok) throw new Error(d.error || "Couldn't write next steps."); return d.plan as NextStepsPlan; })
      .then((p) => {
        if (cancelled) return;
        const withDone = { ...p, done: [] };
        bumpUsage("plansMade");
        storePlan(job.id, withDone);
        setPlan(withDone);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => { cancelled = true; };
    // Only when the job changes or the student asks again; matched/missing/deadline follow the job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, attempt]);

  if (error) {
    return <p className="mt-2 text-sm text-red-600">{error} <button onClick={() => setAttempt((a) => a + 1)} className="font-semibold underline">Try again</button></p>;
  }
  if (!plan) {
    return (
      <div className="mt-2 space-y-2" aria-label="Writing your next steps">
        <p className="text-sm text-slate-500">Writing a plan for this internship from your resume and the posting…</p>
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-11 w-full" />)}
      </div>
    );
  }

  const toggle = (i: number) => {
    const next = new Set(done);
    if (next.has(i)) next.delete(i); else next.add(i);
    const p = { ...plan, done: [...next] };
    storePlan(job.id, p);
    setPlan(p);
  };
  const email = EMAIL_TYPES.find((t) => t.id === plan.suggestedEmail);

  return (
    <div className="mt-2 space-y-3">
      <p className="border-l-2 border-blue-500 pl-3 text-[15px] leading-relaxed text-slate-800">{plan.headline}</p>
      <ol className="space-y-2">
        {plan.steps.map((s, i) => (
          <li key={i} className={`flex gap-3 rounded-md border border-slate-200 p-3 ${done.has(i) ? "bg-slate-50 opacity-60" : "bg-surface"}`}>
            <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} aria-label={`Mark "${s.title}" done`} className="mt-1 h-4 w-4 shrink-0 accent-blue-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={`font-medium text-slate-900 ${done.has(i) ? "line-through" : ""}`}>{i + 1}. {s.title}</p>
                <span className="tag tag-soft shrink-0">{s.when}</span>
              </div>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {plan.prep.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500">Get ready</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {plan.prep.map((p) => <li key={p} className="flex gap-2 text-sm text-slate-700"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{p}</li>)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <span className="min-w-0 flex-1">
          Save this internship to keep these steps{email ? `, write the ${email.label.toLowerCase()}` : ""}, track deadlines and practice the interview.
        </span>
        <button onClick={() => onSave(plan)} className="btn-primary px-3 py-1.5">Save with this plan</button>
      </div>
    </div>
  );
}

const REASONS = ["The link is broken", "It's closed or no longer listed", "Some information is wrong", "It looks like a scam"];

// "Not for me" hides the internship from your search; "Report a problem" saves
// a note on this device and, if you want, opens a prefilled GitHub issue you
// can review before sending. Nothing is sent automatically.
function Feedback({ job, onHide }: { job: ScoredJob; onHide?: () => void }) {
  const [reports, setReports] = useStored<Report[]>(KEYS.reports, []);
  const [open, setOpen] = useState(false);
  const mine = reports.find((r) => r.id === job.id);
  const report = (reason: string) => {
    setReports((list) => [{ id: job.id, title: job.title, company: job.company, reason, at: new Date().toISOString() }, ...list.filter((r) => r.id !== job.id)].slice(0, 100));
    setOpen(false);
  };
  const issue = mine
    ? `https://github.com/haricharanparna/InternAgent/issues/new?title=${encodeURIComponent(`Listing problem: ${job.title} at ${job.company}`)}&body=${encodeURIComponent(`Problem: ${mine.reason}\nListing: ${job.title} at ${job.company}\nLink: ${job.url}\nSource: ${job.source}`)}`
    : "";
  return (
    <section aria-labelledby="feedback-h" className="rounded-md border border-slate-200 p-3 text-sm">
      <h3 id="feedback-h" className="sr-only">Feedback on this listing</h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onHide && <button onClick={onHide} className="text-slate-700 underline underline-offset-2">👎 Not for me: hide it</button>}
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-slate-700 underline underline-offset-2">⚑ Report a problem</button>
        {mine && <span className="text-slate-500">You reported: {mine.reason.toLowerCase()}.</span>}
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {REASONS.map((r) => <button key={r} onClick={() => report(r)} className="rounded-md border border-slate-300 px-2 py-1 hover:border-slate-500">{r}</button>)}
        </div>
      )}
      {mine && (
        <p className="mt-2 text-xs text-slate-500">
          Saved on this device{/closed|scam/i.test(mine.reason) && onHide ? "; you can also hide it above" : ""}.{" "}
          <a href={issue} target="_blank" rel="noreferrer" className="underline underline-offset-2">Tell the InternAgent maintainers ↗</a> (opens a GitHub issue you can review before sending; it includes only the listing, nothing about you).
        </p>
      )}
    </section>
  );
}
