"use client";

import { useCallback, useEffect, useState } from "react";
import type { OfferDetails } from "./offers";
import type { AppStatus, Contact, InterviewPrep, NextStepsPlan, Opportunity, ScoredJob } from "./types";

export const STATUSES = [
  { id: "saved", label: "Saved", color: "bg-slate-100 text-slate-700" },
  { id: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { id: "assessment", label: "Assessment", color: "bg-violet-100 text-violet-800" },
  { id: "interview", label: "Interview", color: "bg-amber-100 text-amber-800" },
  { id: "offer", label: "Offer", color: "bg-emerald-100 text-emerald-800" },
  { id: "rejected", label: "Rejected", color: "bg-rose-100 text-rose-700" },
  { id: "withdrawn", label: "Withdrawn", color: "bg-slate-200 text-slate-600" },
] as const;

export type Status = AppStatus;

export type TrackedApp = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  fitScore?: number;
  status: Status;
  savedAt: string;
  appliedAt?: string;
  notes: string;
  // Kept so next steps and emails can be specific to this posting.
  description?: string;
  matched?: string[];
  missing?: string[];
  plan?: NextStepsPlan;
  prep?: InterviewPrep;
  contacts?: Contact[];
  custom?: boolean;
  // Optional dates the student sets (ISO strings).
  interviewAt?: string;
  deadline?: string;
  // Which resume the student sent: their original, or a tailored version (by when it was made).
  resumeUsed?: { kind: "original" | "tailored"; at?: string };
  // Details the student enters once they hold an offer.
  offer?: OfferDetails;
};

export const toOpportunity = (a: TrackedApp): Opportunity => ({
  title: a.title, company: a.company, location: a.location, url: a.url, description: a.description,
  matched: a.matched, missing: a.missing, status: a.status, appliedAt: a.appliedAt, notes: a.notes, deadline: a.deadline, interviewAt: a.interviewAt,
});

const KEY = "internagent.tracker";
export const FOLLOW_UP_DAYS = 7;

// Applied this many days ago with no reply yet → nudge the student to follow up.
export const QUIET_DAYS = 30;

// Applied this long ago with no reply: most companies that are still interested reply by now.
export function quietDays(app: TrackedApp, now = Date.now()) {
  if (app.status !== "applied" || !app.appliedAt) return 0;
  const days = Math.floor((now - new Date(app.appliedAt).getTime()) / 86_400_000);
  return days >= QUIET_DAYS ? days : 0;
}

export function followUpDue(app: TrackedApp, now = Date.now()) {
  if (app.status !== "applied" || !app.appliedAt) return false;
  return now - new Date(app.appliedAt).getTime() >= FOLLOW_UP_DAYS * 86_400_000;
}

export function useTracker() {
  const [apps, setApps] = useState<TrackedApp[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setApps(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(apps));
    } catch {}
  }, [apps, loaded]);

  const add = useCallback((job: ScoredJob, extra?: Partial<TrackedApp>) => {
    setApps((prev) =>
      prev.some((a) => a.id === job.id)
        ? prev
        : [
            {
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              url: job.url,
              fitScore: job.fit?.score,
              description: job.description.slice(0, 6000), // enough to reach the requirements, past the company intro
              matched: job.fit?.matched,
              missing: job.fit?.missing,
              status: "saved",
              savedAt: new Date().toISOString(),
              notes: "",
              custom: job.custom,
              deadline: job.deadline?.slice(0, 10),
              ...extra,
            },
            ...prev,
          ],
    );
  }, []);

  const update = useCallback((id: string, patch: Partial<TrackedApp>) => {
    setApps((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...patch };
        // Any stage past "saved" (except withdrawing before applying) means it was sent.
        if (patch.status && patch.status !== "saved" && patch.status !== "withdrawn" && !a.appliedAt) next.appliedAt = new Date().toISOString();
        return next;
      }),
    );
  }, []);

  const remove = useCallback((id: string) => setApps((prev) => prev.filter((a) => a.id !== id)), []);

  return { apps, add, update, remove };
}
