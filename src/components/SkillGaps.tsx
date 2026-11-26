"use client";

import { useEffect, useMemo, useState } from "react";
import { STRONG, skillGaps, whatIf } from "@/lib/skillGaps";
import { projectFor, resourcesFor } from "@/lib/learning";
import type { Job, Profile } from "@/lib/types";
import { KEYS, useStored } from "@/lib/prefs";
import { apiFetch, readJSON } from "@/lib/api";

const KEY = "internagent.learning";

// Skill gaps → learning roadmap → what-if. Everything is counted from today's
// real postings with the same free keyword match the job cards use.
export default function SkillGaps({ profile, onSearch, onAddSkill }: { profile: Profile | null; onSearch: () => void; onAddSkill?: (skill: string) => void }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [learned, setLearned] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/jobs")
      .then(async (r) => { const d = await readJSON(r); if (!r.ok) throw new Error(d.error); setJobs(d.jobs); })
      .catch((e) => setError((e as Error).message || "Couldn't load postings."));
    try { setLearned(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
  }, []);

  const report = useMemo(() => (jobs && profile ? skillGaps(jobs, profile) : null), [jobs, profile]);
  const sim = useMemo(() => (jobs && profile && picked.length ? whatIf(jobs, profile, picked) : null), [jobs, profile, picked]);
  const plan = picked.length ? picked : report?.gaps.slice(0, 2).map((g) => g.skill) || [];

  const toggleLearned = (s: string) => {
    const next = learned.includes(s) ? learned.filter((x) => x !== s) : [...learned, s];
    setLearned(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  if (!profile) {
    return (
      <section className="space-y-3">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-slate-900">Skill gaps</h1>
        <p className="text-slate-600">Upload or build a resume first, then this page shows which skills would open up the most internships for you.</p>
        <button onClick={onSearch} className="btn-primary">Go to search</button>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="kicker">Skill gap → opportunity</p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">What to learn next, and what it unlocks</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Counted from today&apos;s real postings with the same keyword match as the job cards: no AI, no guesses. A posting is a
          &quot;strong match&quot; at {STRONG}%+ of the skills it names.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!report && !error && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12 w-full" />)}</div>}

      {report && (
        <>
          <dl className="grid grid-cols-3 border-y border-slate-200">
            {[
              [report.analyzed, "postings with full descriptions"],
              [report.relevant, "share 2+ skills with your resume"],
              [report.strongNow, "are a strong match today"],
            ].map(([n, l], i) => (
              <div key={String(l)} className={`py-4 ${i ? "border-l border-slate-200 pl-4" : ""}`}>
                <dt className="font-serif text-3xl text-slate-900">{n}</dt>
                <dd className="mt-1 text-sm text-slate-500">{l}</dd>
              </div>
            ))}
          </dl>

          <div>
            <h2 className="section-title">Your top skill gaps</h2>
            <p className="mt-1 text-sm text-slate-500">Tick skills to see what changes if you learn them. Only add a skill to your resume once you can really use it.</p>
            {report.gaps.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No gaps found in postings that overlap with your resume. Try Score with AI on the search page for a closer look.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200">
                {report.gaps.map((g) => (
                  <li key={g.skill} className="p-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={picked.includes(g.skill)} onChange={() => setPicked((p) => (p.includes(g.skill) ? p.filter((x) => x !== g.skill) : [...p, g.skill]))} className="h-4 w-4 accent-blue-600" />
                        <span className="font-medium text-slate-900">{g.skill}</span>
                        {learned.includes(g.skill) && <span className="tag bg-emerald-100 text-emerald-800">learning</span>}
                      </label>
                      <span className="text-sm text-slate-600">named in <b>{g.asks}</b> posting{g.asks === 1 ? "" : "s"}</span>
                      <span className="text-sm text-slate-600">{g.unlocks ? <>alone makes <b className="text-emerald-700">{g.unlocks}</b> strong</> : "helps, but not alone"}</span>
                      <button onClick={() => setOpen(open === g.skill ? null : g.skill)} aria-expanded={open === g.skill} className="text-sm font-medium text-blue-700 underline underline-offset-2">{open === g.skill ? "Hide" : "How to learn it"}</button>
                    </div>
                    {open === g.skill && (
                      <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 text-sm">
                        <p className="font-medium text-slate-800">Free resources</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {resourcesFor(g.skill).map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="text-blue-700 underline underline-offset-2">{r.name} ↗</a></li>)}
                        </ul>
                        <p className="font-medium text-slate-800">Project to prove it</p>
                        <p className="text-slate-700">{projectFor(g.skill)}</p>
                        <button onClick={() => toggleLearned(g.skill)} className="btn-secondary px-3 py-1.5">{learned.includes(g.skill) ? "✓ I'm learning this" : "Mark as learning"}</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-blue-200 bg-blue-50/40 p-4">
            <h2 className="font-semibold text-slate-900">What if you learned {picked.length ? picked.join(" + ") : "…"}?</h2>
            {!sim ? (
              <p className="mt-1 text-sm text-slate-600">Tick one or more skills above.</p>
            ) : (
              <>
                <p className="mt-1 text-slate-800">
                  Strong matches: <b>{sim.before}</b> → <b className="text-emerald-700">{sim.after}</b>
                  {sim.after > sim.before ? <> (+{sim.after - sim.before} internships)</> : " (no change; these postings need other skills too)"}
                </p>
                {sim.newlyStrong.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {sim.newlyStrong.slice(0, 8).map(({ job, before, after }) => (
                      <li key={job.id}>
                        <a href={job.url} target="_blank" rel="noreferrer" className="text-slate-800 hover:text-blue-700 hover:underline">{job.title} at {job.company}</a>
                        <span className="text-slate-500"> · {before}% → {after}%</span>
                      </li>
                    ))}
                    {sim.newlyStrong.length > 8 && <li className="text-slate-500">and {sim.newlyStrong.length - 8} more</li>}
                  </ul>
                )}
                <p className="mt-2 text-xs text-slate-500">Based on postings open today. Keyword match is a guide to what employers ask for, not a promise of an interview.</p>
              </>
            )}
          </div>

          {learned.length > 0 && <LearningLog skills={learned} have={profile.skills} onAddSkill={onAddSkill} />}

          {plan.length > 0 && (
            <div>
              <h2 className="section-title">Your 4-week plan</h2>
              <p className="mt-1 text-sm text-slate-500">For {plan.join(" and ")}{picked.length ? "" : " (your top gaps; tick others above to change it)"}. About 4–6 hours a week.</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {weeks(plan).map((w, i) => (
                  <li key={i} className="rounded-md border border-slate-200 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Week {i + 1}</p>
                    <p className="mt-0.5 font-medium text-slate-900">{w.title}</p>
                    <p className="text-slate-600">{w.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function weeks(skills: string[]) {
  const [a, b] = [skills[0], skills[1] || skills[0]];
  const first = (s: string) => resourcesFor(s)[0];
  return [
    { title: `Learn the basics of ${a}`, detail: `Work through ${first(a).name}. Take notes on what you'd use at work.` },
    { title: `Build something small with ${a}`, detail: projectFor(a).split(" Then")[0] },
    a === b
      ? { title: `Go deeper with ${a}`, detail: `Add one feature to your project that a posting asks for, and write tests or a short write-up.` }
      : { title: `Learn the basics of ${b}`, detail: `Work through ${first(b).name}, then use ${b} in your week-2 project if it fits.` },
    { title: "Show it and update your resume", detail: "Put the project on GitHub with a README, add one honest bullet to your resume, then re-run this page to see your new matches." },
  ];
}

type LogEntry = { skill: string; h: number; at: string };
const GOAL = 20; // hours: the 4-week plan at about 5 hours a week

// Hours spent on each skill you're learning, logged by you and kept in this browser.
function LearningLog({ skills, have, onAddSkill }: { skills: string[]; have: string[]; onAddSkill?: (skill: string) => void }) {
  const [log, setLog] = useStored<LogEntry[]>(KEYS.hours, []);
  const week = Date.now() - 7 * 86_400_000;
  const total = (s: string) => log.filter((e) => e.skill === s).reduce((n, e) => n + e.h, 0);
  const thisWeek = log.filter((e) => new Date(e.at).getTime() >= week).reduce((n, e) => n + e.h, 0);
  const add = (skill: string, h: number) => setLog((l) => [...l, { skill, h, at: new Date().toISOString() }].slice(-500));
  const undo = (skill: string) => setLog((l) => { const i = l.map((e) => e.skill).lastIndexOf(skill); return i < 0 ? l : [...l.slice(0, i), ...l.slice(i + 1)]; });
  return (
    <div>
      <h2 className="section-title">Learning log</h2>
      <p className="mt-1 text-sm text-slate-500">
        Log time as you study. <b className="text-slate-700">{thisWeek} hour{thisWeek === 1 ? "" : "s"}</b> this week. About {GOAL} hours (5 a week for 4 weeks) is enough for a first project.
      </p>
      <ul className="mt-3 space-y-3">
        {skills.map((s) => {
          const h = total(s);
          return (
            <li key={s} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-900">{s}</span>
                <span className="flex items-center gap-1.5">
                  <span className="tabular-nums text-slate-600">{h} / {GOAL} h</span>
                  {[0.5, 1, 2].map((n) => <button key={n} onClick={() => add(s, n)} className="rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:border-slate-500" aria-label={`Log ${n} hour${n === 1 ? "" : "s"} on ${s}`}>+{n}h</button>)}
                  {h > 0 && <button onClick={() => undo(s)} className="text-xs text-slate-500 underline underline-offset-2">Undo</button>}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`${s} hours`} aria-valuenow={h} aria-valuemin={0} aria-valuemax={GOAL}>
                <div className={`h-full rounded-full ${h >= GOAL ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, (h / GOAL) * 100)}%` }} />
              </div>
              {h >= GOAL && <p className="mt-1.5 text-xs text-emerald-700">Goal reached. Finish your project, then add {s} to your resume if you can really use it.</p>}
              {have.some((x) => x.toLowerCase() === s.toLowerCase())
                ? <p className="mt-1.5 text-xs text-emerald-700">✓ {s} is on your profile.</p>
                : onAddSkill && h > 0 && (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Can you use {s} on your own now?{" "}
                    <button onClick={() => onAddSkill(s)} className="font-medium text-blue-700 underline underline-offset-2">Add it to my skills</button>
                    {" "}(your matches and Skill gaps update; only add it if it&apos;s true).
                  </p>
                )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
