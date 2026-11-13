"use client";

import { useEffect, useState } from "react";
import { downloadResumePdf } from "@/lib/resumePdf";
import type { Job, Profile, TailoredResume } from "@/lib/types";

type Props = { profile: Profile; job: Job; onClose: () => void };

export default function TailorPanel({ profile, job, onClose }: Props) {
  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tailor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, job }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) setResume(data.resume);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Could not tailor resume.");
      }
    })();
    return () => { cancelled = true; };
  }, [profile, job]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changed = resume?.experiences.flatMap((e) => e.bullets).filter((b) => b.tailored !== b.original).length ?? 0;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div className="animate-pop-in w-full max-w-5xl overflow-hidden rounded-3xl bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-surface to-cyan-50 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Tailored resume</p>
            <h2 className="mt-1 text-lg font-semibold">{job.title}</h2>
            <p className="text-sm text-slate-600">{job.company}</p>
          </div>
          <div className="flex gap-2">
            {resume && (
              <button
                onClick={() => downloadResumePdf(profile, resume, job.company)}
                className="btn-primary"
              >
                Download PDF
              </button>
            )}
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>

        <div className="p-5">
          {!resume && !error && (
            <div className="flex flex-col items-center gap-3 py-14 text-slate-500"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />Rewriting your resume for this posting…</div>
          )}
          {error && <p className="py-12 text-center text-red-600">{error}</p>}

          {resume && (
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <b>{changed} bullets reworded.</b> Nothing was added that isn&apos;t already in your resume.
                Only your real skills are listed, reordered by relevance.
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700">Summary</h3>
                <p className="mt-1 text-sm text-slate-800">{resume.summary}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700">Skills, most relevant first</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {resume.skills.map((s) => (
                    <span key={s} className="chip bg-blue-50 text-blue-700">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <div className="hidden grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>Original</span>
                  <span>Tailored</span>
                </div>
                {resume.experiences.map((e, i) => (
                  <div key={i} className="mt-4">
                    <p className="font-medium">
                      {e.title} <span className="font-normal text-slate-500">· {e.organization}</span>
                    </p>
                    {e.bullets.map((b, j) => {
                      const same = b.tailored === b.original;
                      return (
                        <div key={j} className="mt-2 grid gap-2 text-sm sm:grid-cols-2 sm:gap-4">
                          <p className="rounded-lg bg-slate-50 p-3 text-slate-600">{b.original}</p>
                          <div className={`rounded-lg p-3 ${same ? "bg-slate-50" : "bg-blue-50 ring-1 ring-blue-100"}`}>
                            <p className="text-slate-900">{b.tailored}</p>
                            {!same && <p className="mt-1.5 text-xs text-blue-700">↳ {b.why}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {resume.gaps.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900">Gaps for this role. These were not added to your resume.</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {resume.gaps.map((g) => <li key={g}>{g}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
