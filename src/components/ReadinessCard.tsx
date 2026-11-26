"use client";

import { useState } from "react";
import { readinessOf, useReadyFlags } from "@/lib/readiness";
import { priorityOf } from "@/lib/priority";
import type { Profile, ScoredJob } from "@/lib/types";
import type { TrackedApp } from "@/lib/tracker";

const tone = (n: number) => (n >= 75 ? "text-emerald-700" : n >= 50 ? "text-amber-700" : "text-rose-700");
const bar = (n: number) => (n >= 75 ? "bg-emerald-500" : n >= 50 ? "bg-amber-500" : "bg-rose-400");

// "Is my application ready?" A checklist with the fix for each open item.
export function ReadinessCard({ job, profile, app }: { job: ScoredJob; profile: Profile; app?: TrackedApp }) {
  const flags = useReadyFlags(job.id);
  const r = readinessOf(job, profile, flags, app);
  const [open, setOpen] = useState(false);
  const todo = r.checks.filter((c) => !c.done);
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <span className="shrink-0 text-sm font-semibold text-slate-900">Application readiness</span>
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"><span className={`block h-full rounded-full ${bar(r.score)}`} style={{ width: `${r.score}%` }} /></span>
        <span className={`shrink-0 text-sm font-semibold ${tone(r.score)}`}>{r.score}%</span>
        <span className="shrink-0 text-xs text-slate-500">{open ? "Hide" : `${todo.length} to do`}</span>
      </button>
      {open && (
        <ul className="mt-3 space-y-2">
          {r.checks.map((c) => (
            <li key={c.label} className="flex gap-2 text-sm">
              <span aria-hidden className={c.done ? "text-emerald-600" : "text-slate-400"}>{c.done ? "✓" : "○"}</span>
              <span className="min-w-0">
                <span className={c.done ? "text-slate-500" : "font-medium text-slate-800"}>{c.label}</span>
                <span className="sr-only">{c.done ? " (done)" : " (to do)"}</span>
                {!c.done && <span className="block text-slate-600">{c.fix}</span>}
              </span>
            </li>
          ))}
          <li className="text-xs text-slate-500">Each check counts equally. It tracks what you&apos;ve prepared, not your chances.</li>
        </ul>
      )}
    </div>
  );
}

// "Why is this near the top of my list?" The priority factors, each with its points.
export function PriorityBreakdown({ job, profile }: { job: ScoredJob; profile: Profile }) {
  const p = priorityOf(job, profile);
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-900">Apply-first priority</span>
        <span className={`font-semibold ${tone(p.score)}`}>{p.score}/100</span>
      </p>
      <ul className="mt-2 space-y-1.5">
        {p.factors.map((f) => (
          <li key={f.label} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-sm">
            <span className="text-slate-700">{f.label}</span>
            <span className="min-w-0">
              <span className="block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${(f.points / f.max) * 100}%` }} /></span>
              <span className="mt-0.5 block truncate text-xs text-slate-500" title={f.note}>{f.note}</span>
            </span>
            <span className="text-right text-xs tabular-nums text-slate-600">{f.points}/{f.max}</span>
          </li>
        ))}
      </ul>
      {p.warnings.map((w) => <p key={w} className="mt-2 text-sm text-amber-800">⚠ {w}</p>)}
      <p className="mt-2 text-xs text-slate-500">A way to order your list, not a prediction of getting hired. Match 40 · eligibility 20 · deadline 20 · freshness 10 · pay listed 10.</p>
    </div>
  );
}
