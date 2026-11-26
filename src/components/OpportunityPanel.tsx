"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { STATUSES, toOpportunity, type TrackedApp } from "@/lib/tracker";
import { EMAIL_TYPES, type EmailDraft, type EmailType, type NextStepsPlan, type Profile, type ScoredJob } from "@/lib/types";
import { bumpUsage } from "@/lib/usage";
import CompanyLogo from "./CompanyLogo";
import InterviewPrep from "./InterviewPrep";
import Contacts from "./Contacts";
import { printLetter } from "@/lib/resumePdf";
import { markReady } from "@/lib/readiness";
import { ReadinessCard } from "./ReadinessCard";
import { CompanyResearch, InterviewDay, ResumeUsed } from "./ApplyKit";
import { printPacket } from "@/lib/packet";
import { useStored } from "@/lib/prefs";

type Props = {
  app: TrackedApp;
  profile: Profile | null;
  onUpdate: (id: string, patch: Partial<TrackedApp>) => void;
  onClose: () => void;
};

// The email that usually fits each stage, used until the AI suggests one.
const DEFAULT_EMAIL: Record<TrackedApp["status"], EmailType> = {
  saved: "outreach",
  applied: "follow_up",
  assessment: "follow_up",
  interview: "thank_you",
  withdrawn: "decline",
  offer: "accept",
  rejected: "thank_you",
};

// A saved application as a job, for the readiness checks.
const appAsJob = (a: TrackedApp): ScoredJob => ({
  id: a.id, title: a.title, company: a.company, location: a.location, url: a.url, source: "greenhouse", custom: a.custom,
  description: a.description || "", deadline: a.deadline,
  fit: a.fitScore !== undefined ? { id: a.id, score: a.fitScore, matched: a.matched || [], missing: a.missing || [], reason: "" } : undefined,
});

const post = async <T,>(url: string, body: unknown): Promise<T> => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};

export default function OpportunityPanel({ app, profile, onUpdate, onClose }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useFocusTrap(box);
  const [tab, setTab] = useState<"steps" | "email" | "interview" | "people">(app.status === "interview" ? "interview" : "steps");
  const [emailType, setEmailType] = useState<EmailType>(DEFAULT_EMAIL[app.status]);
  // Who the next email is to (set from the People tab); the key remounts the writer.
  const [to, setTo] = useState({ name: "", n: 0 });

  useEffect(() => {
    // Escape closes the tailored resume first when it is open on top.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[data-tailor-panel]") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function writeEmail(type: EmailType) {
    setEmailType(type);
    setTab("email");
  }

  const tabClass = (t: typeof tab) =>
    `-mb-px border-b-2 px-1 pb-2 text-sm font-medium transition ${tab === t ? "border-blue-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-label={`Next steps for ${app.title}`} className="animate-pop-in w-full max-w-3xl overflow-hidden rounded-3xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-slate-50 px-5 pt-5">
          <div className="flex items-start gap-3">
            <CompanyLogo company={app.company} url={app.url} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Your opportunity</p>
              <h2 className="mt-0.5 text-xl font-medium leading-snug text-slate-900">{app.title}</h2>
              <p className="text-sm text-slate-600">
                {app.company} · {app.location} ·{" "}
                <a href={app.url} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2">View posting ↗</a>{" "}·{" "}
                <button onClick={() => printPacket(app, profile)} className="text-blue-600 underline underline-offset-2" title="One page with key facts, your research, practice answers, questions to ask and the resume you sent">🖨 Interview packet</button>
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary shrink-0 px-3 py-1.5" aria-label="Close">✕</button>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <nav className="flex gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:gap-5">
              <button className={tabClass("steps")} onClick={() => setTab("steps")}>Next steps</button>
              <button className={tabClass("email")} onClick={() => setTab("email")}>Emails &amp; cover letter</button>
              <button className={tabClass("interview")} onClick={() => setTab("interview")}>Interview prep</button>
              <button className={tabClass("people")} onClick={() => setTab("people")}>People{app.contacts?.length ? ` (${app.contacts.length})` : ""}</button>
            </nav>
            <label className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              Stage
              <select
                value={app.status}
                onChange={(e) => onUpdate(app.id, { status: e.target.value as TrackedApp["status"] })}
                className="rounded-md border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-800"
              >
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="p-5">
          {!profile ? (
            <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Upload your resume on the Search tab first, so the steps and emails can use your real experience.
            </p>
          ) : tab === "people" ? (
            <Contacts app={app} onUpdate={onUpdate} onEmail={(c) => { setTo({ name: [c.name, c.role].filter(Boolean).join(", "), n: to.n + 1 }); setTab("email"); }} />
          ) : tab === "interview" ? (
            <div className="space-y-6">
              <InterviewDay app={app} onUpdate={onUpdate} />
              <InterviewPrep app={app} profile={profile} onUpdate={onUpdate} />
            </div>
          ) : tab === "steps" ? (
            <div className="space-y-8">
              <Steps app={app} profile={profile} onUpdate={onUpdate} onWriteEmail={writeEmail} />
              <ResumeUsed app={app} job={appAsJob(app)} profile={profile} onUpdate={onUpdate} />
              <CompanyResearch app={app} />
            </div>
          ) : (
            <EmailWriter key={to.n} app={app} profile={profile} type={emailType} setType={setEmailType} initialRecipient={to.name} onUpdate={onUpdate} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Next steps ----------

function Steps({ app, profile, onUpdate, onWriteEmail }: {
  app: TrackedApp; profile: Profile; onUpdate: Props["onUpdate"]; onWriteEmail: (t: EmailType) => void;
}) {
  const fresh = app.plan && app.plan.status === app.status ? app.plan : null;
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef("");

  useEffect(() => {
    if (fresh && attempt === 0) return;
    const key = `${app.id}:${app.status}:${attempt}`;
    if (inFlight.current === key) return; // avoid a duplicate request for the same stage
    inFlight.current = key;
    setError("");
    setBusy(true);
    post<{ plan: NextStepsPlan }>("/api/next-steps", { profile, opportunity: toOpportunity(app) })
      .then(({ plan }) => {
        bumpUsage("plansMade");
        onUpdate(app.id, { plan: { ...plan, done: [] } });
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id, app.status, attempt]);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error} <button onClick={() => setAttempt((a) => a + 1)} className="font-semibold underline">Try again</button>
      </p>
    );
  }
  if (!fresh || busy) {
    return (
      <div className="space-y-3" aria-label="Writing your next steps">
        <p className="text-sm text-slate-500">Writing next steps for this {STATUSES.find((s) => s.id === app.status)?.label.toLowerCase()} application…</p>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full" />)}
      </div>
    );
  }

  const done = new Set(fresh.done || []);
  const toggle = (i: number) => {
    const next = new Set(done);
    if (next.has(i)) next.delete(i); else next.add(i);
    onUpdate(app.id, { plan: { ...fresh, done: [...next] } });
  };
  const suggested = EMAIL_TYPES.find((t) => t.id === fresh.suggestedEmail);

  return (
    <div className="space-y-6">
      {app.status === "saved" && <ReadinessCard job={appAsJob(app)} profile={profile} app={app} />}
      <p className="border-l-2 border-blue-500 pl-3 text-[15px] leading-relaxed text-slate-800">{fresh.headline}</p>

      <ol className="space-y-2">
        {fresh.steps.map((s, i) => (
          <li key={i} className={`flex gap-3 rounded-md border border-slate-200 p-3 transition ${done.has(i) ? "bg-slate-50 opacity-60" : "bg-surface"}`}>
            <input
              type="checkbox"
              checked={done.has(i)}
              onChange={() => toggle(i)}
              aria-label={`Mark "${s.title}" done`}
              className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
            />
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

      {fresh.prep.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prepare for this role</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {fresh.prep.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {suggested ? (
          <button onClick={() => onWriteEmail(suggested.id)} className="btn-primary">✉️ Write the {suggested.label.toLowerCase()} email</button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Written for the {app.status} stage. Changing the stage updates these steps.</span>
          <button onClick={() => setAttempt((a) => a + 1)} className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">Regenerate</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Email writer ----------

function EmailWriter({ app, profile, type, setType, initialRecipient = "", onUpdate }: {
  app: TrackedApp; profile: Profile; type: EmailType; setType: (t: EmailType) => void; initialRecipient?: string; onUpdate: Props["onUpdate"];
}) {
  const [draftId, setDraftId] = useState("");
  const [notes] = useStored<Record<string, string[]>>("internagent.research", {});
  const research = (notes[app.company] || []).filter((n) => n?.trim());
  const [useResearch, setUseResearch] = useState(true);
  const drafts = app.drafts || [];
  // Keep every draft with the application, so closing the panel loses nothing.
  const keep = (d: EmailDraft, id: string, t: EmailType) => {
    const others = (app.drafts || []).filter((x) => x.id !== id);
    const old = (app.drafts || []).find((x) => x.id === id);
    onUpdate(app.id, { drafts: [{ id, type: t, subject: d.subject, body: d.body, at: old?.at || new Date().toISOString(), sentAt: old?.sentAt }, ...others].slice(0, 10) });
  };
  const [recipient, setRecipient] = useState(initialRecipient);
  const [extra, setExtra] = useState("");
  const [tone, setTone] = useState<"formal" | "conversational" | "enthusiastic">("formal");
  const [length, setLength] = useState<"standard" | "short">("standard");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const { draft } = await post<{ draft: EmailDraft }>("/api/email", {
        profile, opportunity: toOpportunity(app), type, recipient, extra, tone, length, research: useResearch ? research : [],
      });
      bumpUsage("emailsWritten");
      if (type === "cover_letter") markReady(app.id, "coverLetterAt");
      const id = Date.now().toString(36);
      setDraftId(id);
      keep(draft, id, type);
      setDraft(draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const placeholders = draft ? [...new Set(`${draft.subject} ${draft.body}`.match(/\[[^\]]+\]/g) || [])] : [];
  const toEmail = app.contacts?.find((c) => recipient.startsWith(c.name) && c.email)?.email || "";
  const mailto = draft ? `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}` : "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">What kind of email?</p>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Email type">
          {EMAIL_TYPES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={type === t.id}
              onClick={() => { setType(t.id); setDraft(null); setDraftId(""); }}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${type === t.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-surface text-slate-700 hover:border-slate-400"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">{EMAIL_TYPES.find((t) => t.id === type)?.hint}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr]">
        <label className="text-sm text-slate-700">
          Who is it to? <span className="text-slate-400">(optional)</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            maxLength={80}
            placeholder="e.g. Ms. Rivera, recruiter"
            className="mt-1 w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm text-slate-700">
          Anything to mention? <span className="text-slate-400">(optional)</span>
          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            maxLength={300}
            placeholder="e.g. we talked about their mobile app at the career fair"
            className="mt-1 w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm text-slate-700">
          Tone
          <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="mt-1 w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm">
            <option value="formal">Formal</option>
            <option value="conversational">Conversational</option>
            <option value="enthusiastic">Enthusiastic (but not over the top)</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Length
          <select value={length} onChange={(e) => setLength(e.target.value as typeof length)} className="mt-1 w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm">
            <option value="standard">Standard</option>
            <option value="short">Short</option>
          </select>
        </label>
      </div>

      {research.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={useResearch} onChange={(e) => setUseResearch(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          Use my research notes on {app.company} ({research.length} answer{research.length === 1 ? "" : "s"}) so it can say why this company
        </label>
      ) : (
        <p className="text-xs text-slate-500">Tip: answer a few research questions in Next steps, and the letter can say why {app.company} specifically.</p>
      )}

      <button onClick={generate} disabled={loading} className="btn-primary">
        {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Writing…</> : draft ? "↻ Write it again" : type === "cover_letter" ? "📝 Write my cover letter" : "✉️ Write my email"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {draft && (
        <div className="animate-fade-in space-y-3 rounded-md border border-slate-200 p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Subject
            <input
              value={draft.subject}
              onChange={(e) => { const d = { ...draft, subject: e.target.value }; setDraft(d); if (draftId) keep(d, draftId, type); }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Message
            <textarea
              value={draft.body}
              onChange={(e) => { const d = { ...draft, body: e.target.value }; setDraft(d); if (draftId) keep(d, draftId, type); }}
              rows={12}
              className="mt-1 w-full rounded-md border border-slate-300 bg-surface p-3 text-sm font-normal normal-case leading-relaxed tracking-normal text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          {placeholders.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Fill in before sending: {placeholders.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="btn-primary px-4 py-2">{copied ? "✓ Copied" : type === "cover_letter" ? "Copy letter" : "Copy email"}</button>
            {type === "cover_letter" ? (
              <button onClick={() => printLetter(`Cover letter - ${app.company}`, draft.body)} className="btn-secondary">⬇ Download PDF</button>
            ) : (
              <a href={mailto} className="btn-secondary">Open in my email app</a>
            )}
          </div>
          {draft.tips.length > 0 && (
            <ul className="space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-600">
              {draft.tips.map((t) => <li key={t}>💡 {t}</li>)}
            </ul>
          )}
          <p className="text-xs text-slate-400">Written only from your resume and notes. Read it over and make it sound like you before sending. Your edits are saved with this application.</p>
        </div>
      )}

      {drafts.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your drafts for this application</p>
          <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 text-sm">
            {drafts.map((d) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 ${d.id === draftId ? "bg-blue-50/50" : ""}`}>
                <span className="tag tag-soft shrink-0">{EMAIL_TYPES.find((t) => t.id === d.type)?.label}</span>
                <span className="min-w-0 flex-1 truncate text-slate-800" title={d.subject}>{d.subject || "(no subject)"}</span>
                <span className="text-xs text-slate-500">{new Date(d.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{d.sentAt ? " · sent" : ""}</span>
                <span className="flex gap-2 text-xs">
                  <button onClick={() => { setType(d.type); setDraftId(d.id); setDraft({ subject: d.subject, body: d.body, tips: [] }); }} className="text-blue-700 underline underline-offset-2">Open</button>
                  <button onClick={() => onUpdate(app.id, { drafts: drafts.map((x) => (x.id === d.id ? { ...x, sentAt: x.sentAt ? undefined : new Date().toISOString() } : x)) })} className="text-blue-700 underline underline-offset-2">{d.sentAt ? "Not sent" : "Mark sent"}</button>
                  <button onClick={() => { onUpdate(app.id, { drafts: drafts.filter((x) => x.id !== d.id) }); if (d.id === draftId) { setDraftId(""); setDraft(null); } }} aria-label={`Delete draft ${d.subject}`} className="text-slate-500 underline underline-offset-2">Delete</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
