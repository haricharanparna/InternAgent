"use client";

import { useEffect, useMemo, useState } from "react";
import { keywordScore } from "@/lib/jobs";
import TailorPanel from "./TailorPanel";
import CompanyLogo from "./CompanyLogo";
import RoleDetails from "./RoleDetails";
import { jobFacts, skillsMentioned } from "@/lib/jobFacts";
import { PLACE_KEY, isNear, isRemote, locateMe, placeLabel, type Place } from "@/lib/location";
import type { Fit, Job, Profile, ScoredJob } from "@/lib/types";

const PAGE = 25;

function scoreTone(score: number) {
  if (score >= 75) return { ring: "#10b981", text: "text-emerald-700", label: "Strong fit" };
  if (score >= 50) return { ring: "#f59e0b", text: "text-amber-700", label: "Possible fit" };
  return { ring: "#f43f5e", text: "text-rose-700", label: "Long shot" };
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div className="flex w-20 shrink-0 flex-col items-center">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-slate-200)" strokeWidth="5" />
          <circle className="animate-ring" style={{ ["--ring-c" as string]: c }} cx="28" cy="28" r={r} fill="none" stroke={tone.ring} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">{score}</span>
      </div>
      <span className={`mt-1 whitespace-nowrap text-[11px] font-semibold ${tone.text}`}>{tone.label}</span>
    </div>
  );
}

type Props = {
  profile: Profile;
  trackedIds: Set<string>;
  onTrack: (job: ScoredJob) => void;
};

export default function JobList({ profile, trackedIds, onTrack }: Props) {
  const [jobs, setJobs] = useState<ScoredJob[]>([]);
  const [loading, setLoading] = useState<"" | "jobs" | "score">("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [tailoring, setTailoring] = useState<Job | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [where, setWhere] = useState<"all" | "near" | "remote">("all");
  const [locating, setLocating] = useState(false);
  const [infoOpen, setInfoOpen] = useState<Set<string>>(new Set());

  function toggleInfo(id: string) {
    setInfoOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLACE_KEY);
      if (saved) setPlace(JSON.parse(saved));
    } catch {}
  }, []);

  async function useMyLocation() {
    setError("");
    setLocating(true);
    try {
      const p = await locateMe();
      setPlace(p);
      setWhere("near");
      setShown(PAGE);
      try { localStorage.setItem(PLACE_KEY, JSON.stringify(p)); } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocating(false);
    }
  }

  function forgetLocation() {
    setPlace(null);
    setWhere("all");
    try { localStorage.removeItem(PLACE_KEY); } catch {}
  }

  const terms = useMemo(() => [...profile.skills, ...profile.interests], [profile]);

  async function findJobs() {
    setError("");
    setLoading("jobs");
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const ranked = (data.jobs as Job[])
        .map((j) => ({ job: j, k: keywordScore(j, terms) }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.job);
      setJobs(ranked);
      setShown(PAGE);
    } catch (e) {
      setError((e as Error).message || "Could not load postings.");
    } finally {
      setLoading("");
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = jobs.filter((j) => {
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) return false;
      if (where === "remote") return isRemote(j.location);
      if (where === "near" && place) return isNear(j.location, place) || isRemote(j.location);
      return true;
    });
    return [...list].sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
  }, [jobs, query, where, place]);

  async function scoreWithAI() {
    setError("");
    setLoading("score");
    try {
      const unscored = visible.filter((j) => !j.fit);
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobs: unscored }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const byId = new Map((data.fits as Fit[]).map((f) => [f.id, f]));
      setJobs((prev) => prev.map((j) => (byId.has(j.id) ? { ...j, fit: byId.get(j.id) } : j)));
    } catch (e) {
      setError((e as Error).message || "Scoring failed.");
    } finally {
      setLoading("");
    }
  }

  const scoredCount = jobs.filter((j) => j.fit).length;
  const companies = new Set(visible.map((j) => j.company)).size;

  if (jobs.length === 0) {
    return (
      <section className="card animate-fade-up p-8 text-center">
        <h2 className="text-2xl font-medium text-slate-900">Ready to find your internships</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          We&apos;ll search thousands of live internships from official company job boards and the community-run SimplifyJobs list.
        </p>
        <button onClick={findJobs} disabled={!!loading} className="btn-primary mt-6">
          {loading === "jobs" ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Searching job boards…</>
          ) : (
            "🔍 Find internships"
          )}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {loading === "jobs" && (
          <div className="mt-8 space-y-3 text-left">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                <div className="skeleton h-11 w-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-[var(--header-h)] z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-[var(--page-bg)] px-4 py-3">
        <div className="relative min-w-0 basis-full sm:basis-0 sm:flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
            placeholder="Filter by title, company, or city"
            className="w-full rounded-md border border-slate-300 bg-surface py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <button onClick={findJobs} disabled={!!loading} className="btn-secondary" title="Refresh postings">↻</button>
        <button onClick={scoreWithAI} disabled={!!loading || visible.every((j) => j.fit)} className="btn-primary flex-1 sm:flex-none">
          {loading === "score" ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Scoring…</>
          ) : (
            "✨ Score next 12 with AI"
          )}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "near", "remote"] as const).map((w) => {
          if (w === "near" && !place) return null;
          const label = w === "all" ? "🌎 Anywhere" : w === "remote" ? "🏠 Remote" : `📍 Near ${placeLabel(place!)}`;
          return (
            <button
              key={w}
              onClick={() => { setWhere(w); setShown(PAGE); }}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${where === w ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-surface text-slate-700 hover:border-slate-400"}`}
            >
              {label}
            </button>
          );
        })}
        {place ? (
          <button onClick={forgetLocation} className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
            Forget my location
          </button>
        ) : (
          <button onClick={useMyLocation} disabled={locating} className="rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50">
            {locating ? "Finding you…" : "📍 Use my location"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-slate-500">
        <span>
          <b className="text-slate-800">{visible.length}</b> internships from <b className="text-slate-800">{companies}</b> companies
        </span>
        <span>{scoredCount} scored by AI</span>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {visible.slice(0, shown).map((j, i) => {
          const tracked = trackedIds.has(j.id);
          const f = jobFacts(j);
          const mine = skillsMentioned(j, profile.skills);
          const meta = [
            f.pay && `💵 ${f.pay}`,
            f.degrees && `🎓 ${f.degrees}`,
            f.sponsorship && `🛂 Visa: ${f.sponsorship}`,
          ].filter(Boolean) as string[];
          return (
            <li key={j.id} style={{ animationDelay: `${Math.min(i % PAGE, 10) * 40}ms` }} className="animate-fade-up py-6">
              <div className="flex items-start gap-4">
                <CompanyLogo company={j.company} url={j.url} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="mr-1 font-semibold text-slate-700">{j.company}</span>
                    <span className="tag tag-accent">{f.sourceLabel}</span>
                    {f.category && <span className="tag tag-soft">{f.category}</span>}
                    {f.workplace && <span className="tag tag-soft">{f.workplace}</span>}
                  </div>
                  <h3 className="mt-2 text-xl font-medium leading-snug text-slate-900">{j.title}</h3>
                  {f.snippet ? (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.snippet}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-500">
                      This listing only includes the title, location and term. Open <b className="font-medium text-slate-600">About this role</b> for an explanation.
                    </p>
                  )}
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                    <span>📍 {f.where}</span>
                    {f.term && <><span className="text-slate-300">·</span><span>🗓️ {f.term}</span></>}
                    {f.domain && (
                      <>
                        <span className="text-slate-300">·</span>
                        <a href={j.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-blue-600 hover:decoration-blue-400">
                          {f.domain} ↗
                        </a>
                      </>
                    )}
                  </p>
                  {mine.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="mr-0.5 text-xs text-slate-500">Mentions your skills:</span>
                      {mine.map((m) => <span key={m} className="tag">{m}</span>)}
                    </div>
                  )}
                  {meta.length > 0 && (
                    <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-500">
                      {meta.map((m) => <span key={m}>{m}</span>)}
                    </p>
                  )}

                  {j.fit && (
                    <div className="animate-fade-in mt-4 border-l-2 border-blue-500 pl-3.5 text-sm">
                      <p className="sm:hidden">
                        <b className={scoreTone(j.fit.score).text}>{j.fit.score}/100 · {scoreTone(j.fit.score).label}</b>
                      </p>
                      <p className="text-slate-700">{j.fit.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {j.fit.matched.map((m) => (
                          <span key={m} className="chip bg-emerald-100/70 text-emerald-800">✓ {m}</span>
                        ))}
                        {j.fit.missing.map((m) => (
                          <span key={m} className="chip bg-amber-100/70 text-amber-900">✗ {m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={() => setTailoring(j)} className="btn-primary px-4 py-2">✍️ Tailor my resume</button>
                    <button
                      onClick={() => onTrack(j)}
                      disabled={tracked}
                      className={`btn-secondary ${tracked ? "border-emerald-300 bg-emerald-50 text-emerald-700 disabled:opacity-100" : ""}`}
                    >
                      {tracked ? "✓ Saved" : "＋ Save to tracker"}
                    </button>
                    <button onClick={() => toggleInfo(j.id)} aria-expanded={infoOpen.has(j.id)} className="btn-secondary">
                      About this role
                      <svg className={`transition-transform ${infoOpen.has(j.id) ? "rotate-180" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>

                  {infoOpen.has(j.id) && <RoleDetails job={j} />}
                </div>
                <div className="hidden sm:block">
                  {j.fit ? <ScoreRing score={j.fit.score} /> : <span className="tag tag-soft whitespace-nowrap">Not scored</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {shown < visible.length && (
        <div className="text-center">
          <button onClick={() => setShown((n) => n + PAGE)} className="btn-secondary">
            Show more ({visible.length - shown} left)
          </button>
        </div>
      )}

      {tailoring && <TailorPanel profile={profile} job={tailoring} onClose={() => setTailoring(null)} />}
    </section>
  );
}
