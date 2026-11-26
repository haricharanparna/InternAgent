"use client";

import { useCallback, useEffect, useState } from "react";
import { safeSet } from "./storage";

// Small lists kept in the student's browser (like everything else in
// InternAgent): recently viewed internships, hidden ones, saved searches,
// reports and read notifications. Nothing is sent to a server.

const EVENT = "internagent:prefs";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}

export function useStored<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const load = () => setValue(read(key, fallback));
    load();
    const onChange = (e: Event) => { if (!(e instanceof CustomEvent) || e.detail === key) load(); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", load); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    const value = typeof next === "function" ? (next as (p: T) => T)(read(key, fallback)) : next;
    safeSet(key, JSON.stringify(value));
    setValue(value);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, set];
}

export const KEYS = {
  viewed: "internagent.viewed",
  hidden: "internagent.hidden",
  searches: "internagent.searches",
  reports: "internagent.reports",
  read: "internagent.notifRead",
  newCount: "internagent.newCount",
  watch: "internagent.watch",
  watchNew: "internagent.watchNew",
  hours: "internagent.learningHours",
  onboarded: "internagent.onboarded",
} as const;

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  category: string;
  where: "all" | "near" | "remote";
  paidOnly: boolean;
  sponsorOnly: boolean;
  length: "" | "short" | "long";
  eligibleOnly: boolean;
  sort: string;
};

export type Report = { id: string; title: string; company: string; reason: string; at: string };
