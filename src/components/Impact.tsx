"use client";

import { useEffect, useState } from "react";
import { followUpDue, type TrackedApp } from "@/lib/tracker";
import { readUsage, EMPTY_USAGE, type Usage } from "@/lib/usage";
import { fmt, pct, useStats, type Count } from "@/lib/useStats";

const SOURCE_NAMES: Record<string, string> = {
  simplify: "SimplifyJobs list",
  greenhouse: "Greenhouse boards",
  lever: "Lever boards",
  ashby: "Ashby boards",
};

export function Bars({ title, items, total, note }: { title: string; items: Count[]; total?: number; note?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <h3 className="text-lg font-medium text-slate-900">{title}</h3>
      {note && <p className="text-xs text-slate-500">{note}</p>}
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-slate-700" title={it.label}>{it.label}</span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {fmt(it.count)}
                {total ? <span className="text-slate-400"> · {pct(it.count, total)}</span> : null}
              </span>
            </div>
            <span className="mt-1 block h-2 rounded-sm bg-slate-100">
              <span className="block h-full rounded-sm bg-blue-500" style={{ width: `${(it.count / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatGrid({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-2 border-t border-slate-200 sm:grid-cols-4">
      {items.map((s, i) => (
        <div key={s.label} className={`border-b border-slate-200 py-4 ${i % 2 ? "border-l pl-4" : "pr-4"} ${i % 4 ? "sm:border-l sm:pl-4" : "sm:border-l-0 sm:pl-0"}`}>
          <dt className="font-serif text-4xl text-slate-900">{s.value}</dt>
          <dd className="mt-1 text-sm leading-snug text-slate-500">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function Minutes({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-700">
      {label}
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={240}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(240, Number(e.target.value) || 0)))}
          className="w-16 rounded-md border border-slate-300 bg-surface px-2 py-1 text-right tabular-nums outline-none focus:border-blue-500"
        />
        min
      </span>
    </label>
  );
}

export default function Impact({ apps, onSearch }: { apps: TrackedApp[]; onSearch: () => void }) {
  const { stats, error } = useStats();
  const [usage, setUsage] = useState<Usage>(EMPTY_USAGE);
  // Editable assumptions for the time-saved estimate.
  const [tTailor, setTTailor] = useState(30);
  const [tScreen, setTScreen] = useState(6);
  const [tResearch, setTResearch] = useState(10);
  const [tEmail, setTEmail] = useState(15);

  useEffect(() => setUsage(readUsage()), []);

  const applied = apps.filter((a) => a.status !== "saved");
  const heard = applied.filter((a) => ["interview", "offer", "rejected"].includes(a.status));
  const interviews = apps.filter((a) => a.status === "interview" || a.status === "offer").length;
  const due = apps.filter((a) => followUpDue(a)).length;
  const minutes = usage.resumesTailored * tTailor + usage.postingsScored * tScreen + usage.rolesExplained * tResearch + usage.emailsWritten * tEmail;
  const hours = minutes / 60;
  const scoredApps = applied.filter((a) => typeof a.fitScore === "number");
  const avgFit = scoredApps.length ? Math.round(scoredApps.reduce((n, a) => n + (a.fitScore || 0), 0) / scoredApps.length) : null;
  const nothingYet = !usage.resumesRead && !apps.length;
  // SimplifyJobs listings have no description, so pay can only appear on company-board postings.
  const boardJobs = stats ? stats.total - (stats.bySource.simplify || 0) : 0;

  return (
    <div className="space-y-14">
      <section>
        <p className="kicker">Impact</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-medium leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Less time searching, <em className="text-blue-600">more</em> time applying.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          Every number on this page is computed live: your numbers come from your own browser, and the job market numbers
          come from today&apos;s listings. Nothing here is made up or estimated without telling you how.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="section-title">
          Your impact
          <span className="font-sans text-xs font-normal text-slate-500">Stored only in this browser</span>
        </h2>
        {nothingYet ? (
          <div className="rounded-md bg-slate-100 px-5 py-6">
            <p className="text-slate-700">You haven&apos;t started yet. Upload a resume to see your numbers fill in here.</p>
            <button onClick={onSearch} className="btn-primary mt-4">Start searching</button>
          </div>
        ) : (
          <>
            <StatGrid
              items={[
                { value: fmt(usage.postingsScored), label: "postings fit-scored by AI" },
                { value: fmt(usage.resumesTailored), label: "resumes tailored to a posting" },
                { value: fmt(applied.length), label: "applications sent" },
                { value: applied.length ? pct(heard.length, applied.length) : "—", label: `response rate (${interviews} interview${interviews === 1 ? "" : "s"})` },
              ]}
            />
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
              <div>
                <h3 className="text-lg font-medium text-slate-900">Time you&apos;ve saved</h3>
                <p className="mt-1 font-serif text-5xl text-blue-600">
                  {hours >= 10 ? Math.round(hours) : hours.toFixed(1)} <span className="text-2xl text-slate-500">hours</span>
                </p>
                <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
                  ({usage.resumesTailored} × {tTailor} + {usage.postingsScored} × {tScreen} + {usage.rolesExplained} × {tResearch} + {usage.emailsWritten} × {tEmail}) ÷ 60 = {hours.toFixed(1)} h
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  This is an estimate. The minutes are assumptions about how long each task takes by hand. Change them to match you.
                </p>
              </div>
              <div className="space-y-3 rounded-md border border-slate-200 p-4">
                <Minutes label="Tailoring one resume by hand" value={tTailor} onChange={setTTailor} />
                <Minutes label="Reading a posting to judge your fit" value={tScreen} onChange={setTScreen} />
                <Minutes label="Researching a role and company" value={tResearch} onChange={setTResearch} />
                <Minutes label="Writing an internship email" value={tEmail} onChange={setTEmail} />
              </div>
            </div>
            <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <li className="border-l-2 border-blue-500 pl-3">
                <b className="text-slate-900">{avgFit ?? "—"}</b> average fit score of the jobs you applied to
                {avgFit === null && <span className="text-slate-500"> (score jobs before saving them)</span>}
              </li>
              <li className="border-l-2 border-blue-500 pl-3">
                <b className="text-slate-900">{due}</b> follow-up{due === 1 ? "" : "s"} due now
              </li>
              <li className="border-l-2 border-blue-500 pl-3">
                <b className="text-slate-900">{fmt(usage.emailsWritten)}</b> emails drafted · <b className="text-slate-900">{fmt(usage.plansMade)}</b> next-step plans · <b className="text-slate-900">{fmt(usage.resumesBuilt)}</b> resumes built
              </li>
            </ul>
          </>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="section-title">
          The internship market today
          {stats?.pipeline.fetchedAt && (
            <span className="font-sans text-xs font-normal text-slate-500">
              Updated {new Date(stats.pipeline.fetchedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </span>
          )}
        </h2>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!stats && !error && (
          <div className="space-y-3" aria-label="Loading live numbers">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        )}
        {stats && (
          <>
            <StatGrid
              items={[
                { value: fmt(stats.total), label: "open internships in one search" },
                { value: fmt(stats.companies), label: "companies hiring interns" },
                { value: pct(stats.remote, stats.total), label: "offer a remote option" },
                { value: pct(stats.pay, boardJobs), label: "of company-board postings list hourly pay" },
              ]}
            />
            <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">
              Without InternAgent, a student would check {fmt(stats.companies)} separate career pages to see this list. Only{" "}
              {pct(stats.pay, boardJobs)} of the {fmt(boardJobs)} postings with full descriptions say what they pay, so we show
              pay on a card whenever it&apos;s listed.
            </p>
            <div className="grid gap-10 md:grid-cols-2">
              <Bars title="What kind of work" items={stats.categories} total={stats.total} note="From SimplifyJobs categories" />
              <Bars title="Where the jobs are" items={stats.states} total={stats.total} note="U.S. states, counting each posting once per state" />
              <Bars title="When they start" items={stats.terms} total={stats.total} note="Term listed on the posting" />
              <Bars
                title="Where the listings come from"
                items={Object.entries(stats.bySource).map(([k, v]) => ({ label: SOURCE_NAMES[k] || k, count: v }))}
                total={stats.total}
              />
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Who it helps</h2>
        <ul className="grid gap-x-10 gap-y-4 text-[15px] leading-relaxed text-slate-700 sm:grid-cols-2">
          <li><b className="text-slate-900">First-generation students</b> who don&apos;t have someone to tell them which internships they&apos;re ready for.</li>
          <li><b className="text-slate-900">Students with less time</b> because of jobs or family, who can&apos;t spend hours rewriting resumes.</li>
          <li><b className="text-slate-900">International students</b>, who see visa sponsorship on a card whenever the listing states it.</li>
          <li><b className="text-slate-900">Students who use assistive tech</b>, with larger text, high contrast, a readable font and reduced motion.</li>
        </ul>
        <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-slate-700">
          Free to use, with no account and no paid APIs. Your resume never touches a database.
        </p>
      </section>
    </div>
  );
}
