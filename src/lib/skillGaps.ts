import type { Job, Profile } from "./types";
import { keywordMatch } from "./keywords.ts";

// Skill Gap → Opportunity engine. Uses the same free keyword match as the job
// cards, over every posting with a full description. Plain counting, no AI.

export const STRONG = 70; // keyword match % shown in green on the cards

export type GapSkill = {
  skill: string;
  asks: number; // relevant postings that name it
  unlocks: number; // postings that would reach STRONG if you added only this skill
  unlockIds: string[];
};

export type GapReport = { analyzed: number; relevant: number; strongNow: number; gaps: GapSkill[] };

// Postings "relevant" to you share at least 2 skills with your resume, so a
// marketing student isn't told to learn Kubernetes.
function relevantMatches(jobs: Job[], profile: Profile) {
  const all = jobs.map((j) => ({ j, m: keywordMatch(j, profile) })).filter((x) => x.m) as { j: Job; m: NonNullable<ReturnType<typeof keywordMatch>> }[];
  const rel = all.filter((x) => x.m.matched.length >= 2);
  return { all, rel: rel.length >= 10 ? rel : all };
}

export function skillGaps(jobs: Job[], profile: Profile, limit = 12): GapReport {
  const { all, rel } = relevantMatches(jobs, profile);
  const byskill = new Map<string, GapSkill>();
  for (const { j, m } of rel) {
    const total = m.matched.length + m.missing.length;
    for (const s of m.missing) {
      const g = byskill.get(s) || { skill: s, asks: 0, unlocks: 0, unlockIds: [] };
      g.asks++;
      if (m.pct < STRONG && ((m.matched.length + 1) / total) * 100 >= STRONG) { g.unlocks++; g.unlockIds.push(j.id); }
      byskill.set(s, g);
    }
  }
  const gaps = [...byskill.values()].sort((a, b) => b.unlocks - a.unlocks || b.asks - a.asks || a.skill.localeCompare(b.skill)).slice(0, limit);
  return { analyzed: all.length, relevant: rel.length, strongNow: rel.filter((x) => x.m.pct >= STRONG).length, gaps };
}

export type WhatIf = { before: number; after: number; newlyStrong: { job: Job; before: number; after: number }[] };

// "What if I learn React and SQL?" Recounts strong matches with those skills added.
export function whatIf(jobs: Job[], profile: Profile, add: string[]): WhatIf {
  const more = { ...profile, skills: [...profile.skills, ...add] };
  const { rel } = relevantMatches(jobs, profile);
  let before = 0, after = 0;
  const newlyStrong: WhatIf["newlyStrong"] = [];
  for (const { j, m } of rel) {
    const next = keywordMatch(j, more);
    if (!next) continue;
    if (m.pct >= STRONG) before++;
    if (next.pct >= STRONG) after++;
    if (m.pct < STRONG && next.pct >= STRONG) newlyStrong.push({ job: j, before: m.pct, after: next.pct });
  }
  newlyStrong.sort((a, b) => b.after - a.after);
  return { before, after, newlyStrong };
}
