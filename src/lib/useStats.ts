"use client";

import { useEffect, useState } from "react";

export type Count = { label: string; count: number };

export type Stats = {
  total: number;
  companies: number;
  remote: number;
  pay: number;
  withDescription: number;
  bySource: Record<string, number>;
  categories: Count[];
  states: Count[];
  terms: Count[];
  sponsorship: Count[];
  sponsorshipUnstated: number;
  pipeline: {
    fetchedAt?: string;
    ms?: number;
    raw?: number;
    duplicates?: number;
    sourcesOk?: number;
    sourcesFailed?: number;
    boards: { greenhouse: number; lever: number; ashby: number };
    cacheMinutes: number;
    termRule: string;
    maxAgeDays: number;
  };
};

let cached: Stats | null = null;

// Shared by the Impact and How it works tabs; fetched once per visit.
export function useStats() {
  const [stats, setStats] = useState<Stats | null>(cached);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setError("");
    // Up to 3 tries a few seconds apart: a dropped connection or a server waking up
    // shouldn't leave the page empty.
    (async () => {
      for (let i = 0; i < 3 && !cancelled; i++) {
        try {
          const r = await fetch("/api/stats");
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          cached = d;
          if (!cancelled) setStats(d);
          return;
        } catch {
          if (i < 2) await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
        }
      }
      if (!cancelled) setError("Couldn't load today's numbers. Check your connection, then try again.");
    })();
    return () => { cancelled = true; };
  }, [attempt]);
  return { stats, error, retry: () => setAttempt((a) => a + 1) };
}

export const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "0%");
export const fmt = (n: number) => n.toLocaleString("en-US");
