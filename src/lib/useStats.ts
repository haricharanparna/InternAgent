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
  useEffect(() => {
    if (cached) return;
    fetch("/api/stats")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Couldn't load live numbers.");
        cached = d;
        setStats(d);
      })
      .catch((e) => setError((e as Error).message));
  }, []);
  return { stats, error };
}

export const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "0%");
export const fmt = (n: number) => n.toLocaleString("en-US");
