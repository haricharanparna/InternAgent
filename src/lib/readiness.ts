"use client";

import { useEffect, useState } from "react";
import type { Profile, ScoredJob } from "./types";
import type { TrackedApp } from "./tracker";
import { keywordMatch } from "./keywords";
import { gradWindow } from "./postingFacts";

// Application Readiness: what's done and what's left before you apply to one
// internship. Plain checks on things InternAgent can see; nothing guessed.

type Flags = { tailoredAt?: string; coverLetterAt?: string };
const KEY = "internagent.readiness";
const EVENT = "internagent:readiness";

function readAll(): Record<string, Flags> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

// Records that the student made a tailored resume or cover letter for a job.
export function markReady(jobId: string, what: keyof Flags) {
  try {
    const all = readAll();
    all[jobId] = { ...all[jobId], [what]: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function useReadyFlags(jobId: string): Flags {
  const [flags, setFlags] = useState<Flags>({});
  useEffect(() => {
    const load = () => setFlags(readAll()[jobId] || {});
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(EVENT, load); window.removeEventListener("storage", load); };
  }, [jobId]);
  return flags;
}

export type Check = { label: string; done: boolean; fix: string };
export type Readiness = { score: number; checks: Check[] };

export function readinessOf(job: ScoredJob, profile: Profile, flags: Flags, app?: TrackedApp): Readiness {
  const checks: Check[] = [];
  const km = keywordMatch(job, profile);
  const match = job.fit?.score ?? km?.pct;
  if (match !== undefined) {
    checks.push({
      label: "Your resume shows most of what the posting asks for",
      done: match >= 70,
      fix: km && km.missing.length ? `Add the skills you really have in the posting's words (missing: ${km.missing.slice(0, 4).join(", ")}), or tailor your resume.` : "Tailor your resume to this posting.",
    });
  }
  const win = gradWindow(job);
  const year = Number(String(profile.graduationYear || "").match(/20\d\d/)?.[0]);
  if (win && year) {
    checks.push({ label: "Your graduation year fits the posting", done: year >= win.from && year <= win.to, fix: `The posting says: "${win.quote}" Check with the recruiter before spending time on it.` });
  }
  checks.push({ label: "Resume tailored for this internship", done: !!flags.tailoredAt, fix: "Use Tailor my resume and download the PDF." });
  checks.push({ label: "Cover letter drafted", done: !!flags.coverLetterAt, fix: app ? "Open Emails & cover letter and write one (only needed if the application asks)." : "Save this internship, then write one under Emails & cover letter." });
  checks.push({ label: "Deadline noted", done: !!(job.deadline || app?.deadline), fix: app ? "Add the deadline under Details on its Applications card so it shows in your reminders." : "No deadline is listed. Save it so you can note one and get reminders." });
  checks.push({ label: "Someone to contact at the company", done: !!app?.contacts?.length, fix: app ? "Add a recruiter, alum or friend in the People tab, then write to them." : "Save it, then add a recruiter or alum in the People tab." });
  const done = checks.filter((c) => c.done).length;
  return { score: Math.round((done / checks.length) * 100), checks };
}
