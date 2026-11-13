"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoredJob } from "./types";

export const STATUSES = [
  { id: "saved", label: "Saved", color: "bg-slate-100 text-slate-700" },
  { id: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { id: "interview", label: "Interview", color: "bg-amber-100 text-amber-800" },
  { id: "offer", label: "Offer", color: "bg-emerald-100 text-emerald-800" },
  { id: "rejected", label: "Rejected", color: "bg-rose-100 text-rose-700" },
] as const;

export type Status = (typeof STATUSES)[number]["id"];

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
};

const KEY = "internagent.tracker";
export const FOLLOW_UP_DAYS = 7;

// Applied this many days ago with no reply yet → nudge the student to follow up.
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

  const add = useCallback((job: ScoredJob) => {
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
              status: "saved",
              savedAt: new Date().toISOString(),
              notes: "",
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
        if (patch.status === "applied" && !a.appliedAt) next.appliedAt = new Date().toISOString();
        return next;
      }),
    );
  }, []);

  const remove = useCallback((id: string) => setApps((prev) => prev.filter((a) => a.id !== id)), []);

  return { apps, add, update, remove };
}
