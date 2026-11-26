"use client";

import { useState } from "react";
import type { TrackedApp } from "@/lib/tracker";
import type { Profile, ScoredJob } from "@/lib/types";
import { useVersions } from "@/lib/resumeVersions";
import { downloadResumePdf } from "@/lib/resumePdf";
import { downloadDocx, tailoredResumeParas } from "@/lib/docx";
import { useStored } from "@/lib/prefs";
import TailorPanel from "./TailorPanel";

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fileName = (p: Profile, company: string) => `${(p.name || "Resume").replace(/[^\w]+/g, "_")}_${company.replace(/[^\w]+/g, "_")}.docx`;

// Which resume went with this application: the original, or one of the tailored
// versions made for it (kept here so you can download exactly what you sent).
export function ResumeUsed({ app, job, profile, onUpdate }: { app: TrackedApp; job: ScoredJob; profile: Profile; onUpdate: (id: string, p: Partial<TrackedApp>) => void }) {
  const versions = useVersions(app.id);
  const [tailoring, setTailoring] = useState(false);
  const used = app.resumeUsed;
  const pick = (v: TrackedApp["resumeUsed"]) => onUpdate(app.id, { resumeUsed: v });
  const isUsed = (kind: "original" | "tailored", at?: string) => used?.kind === kind && (kind === "original" || used.at === at);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resume you sent</p>
      <p className="mt-1 text-sm text-slate-500">Mark which version went with this application, so you know what they read before an interview.</p>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 text-sm">
        <li className="flex flex-wrap items-center gap-3 p-2.5">
          <label className="flex flex-1 cursor-pointer items-center gap-2">
            <input type="radio" name={`resume-${app.id}`} checked={isUsed("original")} onChange={() => pick({ kind: "original" })} className="accent-blue-600" />
            <span className="text-slate-800">My original resume</span>
          </label>
        </li>
        {versions.map((v) => {
          const changed = v.resume.experiences.flatMap((e) => e.bullets).filter((b) => b.tailored !== b.original).length;
          return (
            <li key={v.at} className="flex flex-wrap items-center gap-3 p-2.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input type="radio" name={`resume-${app.id}`} checked={isUsed("tailored", v.at)} onChange={() => pick({ kind: "tailored", at: v.at })} className="accent-blue-600" />
                <span className="text-slate-800">Tailored · {when(v.at)}</span>
                <span className="text-slate-500">{changed} bullet{changed === 1 ? "" : "s"} reworded</span>
              </label>
              <span className="flex gap-2">
                <button onClick={() => downloadResumePdf(v.profile, v.resume, app.company)} className="text-blue-700 underline underline-offset-2">PDF</button>
                <button onClick={() => downloadDocx(tailoredResumeParas(v.profile, v.resume), fileName(v.profile, app.company))} className="text-blue-700 underline underline-offset-2">Word</button>
              </span>
            </li>
          );
        })}
      </ul>
      <button onClick={() => setTailoring(true)} className="btn-secondary mt-2 px-3 py-1.5">✍️ {versions.length ? "Tailor again" : "Tailor my resume for this posting"}</button>
      {used?.kind === "tailored" && !versions.some((v) => v.at === used.at) && <p className="mt-1 text-xs text-amber-700">The version you marked is no longer stored in this browser (only the last 3 per internship are kept).</p>}
      {tailoring && <TailorPanel profile={profile} job={job} onClose={() => setTailoring(false)} />}
    </div>
  );
}

const QUESTIONS = [
  "What does the company make, and who uses it?",
  "What does this team do, from the posting?",
  "One recent piece of news (last 6 months)",
  "A value or goal they state in their own words",
  "Why you, in one sentence, from your real experience",
];

// A short research checklist with free links. Your notes stay in this browser.
export function CompanyResearch({ app }: { app: TrackedApp }) {
  const [notes, setNotes] = useStored<Record<string, string[]>>("internagent.research", {});
  const mine = notes[app.company] || [];
  const set = (i: number, text: string) => setNotes((n) => { const list = [...(n[app.company] || [])]; list[i] = text; return { ...n, [app.company]: list }; });
  const q = (s: string) => encodeURIComponent(s);
  const links = [
    { name: "Company website", url: `https://www.google.com/search?q=${q(`${app.company} official site`)}` },
    { name: "Recent news", url: `https://news.google.com/search?q=${q(`"${app.company}"`)}` },
    { name: "Intern interview experiences", url: `https://www.google.com/search?q=${q(`"${app.company}" intern interview experience`)}` },
    { name: "Intern pay reports", url: `https://www.google.com/search?q=${q(`${app.company} intern salary levels.fyi`)}` },
    { name: "People on the team (LinkedIn)", url: `https://www.linkedin.com/search/results/people/?keywords=${q(`${app.company} ${app.title.replace(/\b(intern(ship)?|summer|fall|spring|winter|20\d\d)\b|[(),/&–-]/gi, " ").replace(/\s+/g, " ").trim()}`)}` },
  ];
  const answered = QUESTIONS.filter((_, i) => (mine[i] || "").trim()).length;
  return (
    <details className="rounded-md border border-slate-200 px-4 py-3">
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold text-slate-900">Research {app.company}</span>
        <span className="text-slate-500"> · {answered} of {QUESTIONS.length} answered</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {links.map((l) => <a key={l.name} href={l.url} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">{l.name} ↗</a>)}
        </p>
        <ol className="space-y-2">
          {QUESTIONS.map((question, i) => (
            <li key={question}>
              <label className="block font-medium text-slate-800" htmlFor={`rq-${app.id}-${i}`}>{i + 1}. {question}</label>
              <textarea id={`rq-${app.id}-${i}`} rows={2} value={mine[i] || ""} onChange={(e) => set(i, e.target.value)} className="field mt-1 text-sm" placeholder="Your notes" />
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500">Answers to these make a cover letter, outreach email and the &quot;Why us?&quot; interview question much easier. Notes are saved for every {app.company} internship.</p>
      </div>
    </details>
  );
}
