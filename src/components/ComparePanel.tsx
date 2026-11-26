"use client";

import { useEffect } from "react";
import CompanyLogo from "./CompanyLogo";
import { postingFacts } from "@/lib/postingFacts";
import { priorityOf } from "@/lib/priority";
import { keywordMatch } from "@/lib/keywords";
import { hourlyPay, jobFacts } from "@/lib/jobFacts";
import { trustOf } from "@/lib/authenticity";
import type { Profile, ScoredJob } from "@/lib/types";

type Props = { jobs: ScoredJob[]; profile: Profile; onOpen: (j: ScoredJob) => void; onRemove: (id: string) => void; onClose: () => void };

// Side-by-side comparison of up to 3 internships. Every cell comes from the
// posting or InternAgent's own scores, and each "best for" says why.
export default function ComparePanel({ jobs, profile, onOpen, onRemove, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = jobs.map((j) => {
    const facts = Object.fromEntries(postingFacts(j).map((f) => [f.key, f.value]));
    const km = keywordMatch(j, profile);
    return {
      j,
      facts,
      match: j.fit ? j.fit.score : km?.pct,
      matchNote: j.fit ? "AI fit score" : km ? "keyword match" : "",
      priority: priorityOf(j, profile).score,
      pay: hourlyPay(jobFacts(j).pay),
      trust: trustOf(j).label,
      missing: j.fit?.missing || km?.missing || [],
    };
  });

  // "Best for" picks, each with its reason. Ties or missing data → no pick.
  const best = (label: string, pick: (r: (typeof rows)[number]) => number | undefined, why: (r: (typeof rows)[number]) => string) => {
    const scored = rows.map((r) => ({ r, v: pick(r) })).filter((x) => x.v !== undefined && x.v > 0) as { r: (typeof rows)[number]; v: number }[];
    if (!scored.length) return null;
    const top = scored.sort((a, b) => b.v - a.v)[0];
    if (scored.filter((x) => x.v === top.v).length > 1) return null;
    return { label, title: `${top.r.j.title} at ${top.r.j.company}`, why: why(top.r) };
  };
  const picks = [
    best("Best match for your skills", (r) => r.match, (r) => `${r.match}% ${r.matchNote}, the highest of these.`),
    best("Apply to first", (r) => r.priority, (r) => `Highest apply-first priority (${r.priority}/100): match, eligibility, deadline, freshness and pay listed.`),
    best("Highest listed pay", (r) => r.pay || undefined, (r) => `${r.facts.pay} is the highest pay listed here.`),
    best("Fewest skill gaps", (r) => (r.match !== undefined ? 100 - r.missing.length : undefined), (r) => (r.missing.length ? `Only ${r.missing.length} listed skill${r.missing.length === 1 ? "" : "s"} you don't show: ${r.missing.slice(0, 3).join(", ")}.` : "You show every skill the posting names.")),
  ].filter(Boolean) as { label: string; title: string; why: string }[];

  const ROWS: [string, (r: (typeof rows)[number]) => string][] = [
    ["Match", (r) => (r.match !== undefined ? `${r.match}% (${r.matchNote})` : "Not scored")],
    ["Apply-first priority", (r) => `${r.priority}/100`],
    ["Pay", (r) => r.facts.pay || "Not listed"],
    ["Location", (r) => r.facts.where || r.j.location],
    ["Workplace", (r) => r.facts.workplace || "Not stated"],
    ["Dates", (r) => r.facts.dates || "Not stated"],
    ["Length", (r) => r.facts.length || "Not stated"],
    ["Apply by", (r) => r.facts.deadline || "No deadline listed"],
    ["Who can apply", (r) => r.facts.who || "Not stated"],
    ["Visa sponsorship", (r) => r.facts.visa || "Not stated"],
    ["Skills you'd need", (r) => (r.missing.length ? r.missing.slice(0, 5).join(", ") : r.match !== undefined ? "None listed" : "Unknown")],
    ["Housing / return offer", (r) => [r.facts.housing && "Housing help", r.facts.return && "Full-time conversion"].filter(Boolean).join(" · ") || "Not mentioned"],
    ["Source", (r) => r.trust],
  ];

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-3 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Compare internships" className="animate-pop-in w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-5">
          <div>
            <h2 className="text-xl font-medium text-slate-900">Compare internships</h2>
            <p className="mt-0.5 text-sm text-slate-500">Read from each posting and your resume. &quot;Not stated&quot; means the posting doesn&apos;t say.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-slate-500 hover:bg-slate-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-5 p-5">
          {picks.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {picks.map((p) => (
                <li key={p.label} className="rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{p.label}</p>
                  <p className="mt-0.5 font-medium text-slate-900">{p.title}</p>
                  <p className="text-slate-600">{p.why}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40" />
                  {rows.map((r) => (
                    <th key={r.j.id} scope="col" className="border-b border-slate-200 p-2 text-left align-top font-normal">
                      <div className="flex items-start gap-2">
                        <CompanyLogo company={r.j.company} url={r.j.url} size={32} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-600">{r.j.company}</p>
                          <button onClick={() => onOpen(r.j)} className="text-left font-medium leading-snug text-slate-900 hover:text-blue-700 hover:underline">{r.j.title}</button>
                          <button onClick={() => onRemove(r.j.id)} className="mt-1 block text-xs text-slate-500 underline underline-offset-2">Remove</button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, cell]) => (
                  <tr key={label} className="border-b border-slate-100">
                    <th scope="row" className="p-2 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>
                    {rows.map((r) => <td key={r.j.id} className="p-2 align-top text-slate-800">{cell(r)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
