"use client";

import { useEffect, useState } from "react";
import type { Profile, TailoredResume } from "./types";

// Tailored resumes you made, kept per internship in this browser so you can
// see (and re-download) exactly which version you sent.

export type ResumeVersion = { at: string; resume: TailoredResume; profile: Profile };
const KEY = "internagent.resumeVersions";
const EVENT = "internagent:resumeVersions";
const PER_JOB = 3;
const MAX_JOBS = 60;

function readAll(): Record<string, ResumeVersion[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function saveVersion(jobId: string, resume: TailoredResume, profile: Profile) {
  try {
    const all = readAll();
    all[jobId] = [{ at: new Date().toISOString(), resume, profile }, ...(all[jobId] || [])].slice(0, PER_JOB);
    // Keep the newest jobs only, so storage stays small.
    const ids = Object.keys(all).sort((a, b) => all[b][0].at.localeCompare(all[a][0].at));
    for (const id of ids.slice(MAX_JOBS)) delete all[id];
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function useVersions(jobId: string): ResumeVersion[] {
  const [list, setList] = useState<ResumeVersion[]>([]);
  useEffect(() => {
    const load = () => setList(readAll()[jobId] || []);
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(EVENT, load); window.removeEventListener("storage", load); };
  }, [jobId]);
  return list;
}
