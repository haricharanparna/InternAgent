"use client";

import { useMemo } from "react";
import { checkResume } from "@/lib/resumeCheck";
import type { Profile } from "@/lib/types";

// Resume check: plain rules on your own resume text (no AI), each one pointing at the bullet it's about.
export default function ResumeCheckPanel({ profile }: { profile: Profile }) {
  const r = useMemo(() => checkResume(profile), [profile]);
  const tone = r.score >= 85 ? "text-emerald-700" : r.score >= 65 ? "text-amber-700" : "text-rose-700";
  return (
    <details className="mt-4 rounded-md border border-slate-200 px-4 py-3">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 text-sm">
        <span className="font-semibold text-slate-900">Resume check</span>
        <span className={`font-semibold tabular-nums ${tone}`}>{r.score}/100</span>
        <span className="text-slate-500">{r.findings.length ? `${r.findings.length} thing${r.findings.length === 1 ? "" : "s"} to look at` : "looks good"} · readability and applicant-tracking basics</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        {r.findings.length > 0 && (
          <ul className="space-y-2">
            {r.findings.map((f, i) => (
              <li key={i} className="flex gap-2">
                <span className={`tag shrink-0 self-start ${f.level === "fix" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{f.level === "fix" ? "Fix" : "Tip"}</span>
                <span className="min-w-0">
                  <span className="text-slate-800">{f.text}</span>
                  {f.quote && <span className="mt-0.5 block truncate text-slate-500" title={f.quote}>&ldquo;{f.quote}&rdquo;</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {r.passed.length > 0 && (
          <p className="text-slate-600"><span className="font-medium text-emerald-700">✓ Passed:</span> {r.passed.join(" · ")}</p>
        )}
        <p className="text-xs text-slate-500">
          Checked by simple rules, not AI, on the text read from your resume. Only add numbers that are true. Edit your profile above, or use
          Build a resume to rewrite bullets.
        </p>
      </div>
    </details>
  );
}
