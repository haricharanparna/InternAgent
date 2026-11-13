"use client";

import { useEffect, useState } from "react";
import { isRemote } from "@/lib/location";
import type { Job, RoleInfo } from "@/lib/types";

// Survives closing/reopening a card, so each role is only explained once per visit.
const cache = new Map<string, RoleInfo>();

function quickFacts(job: Job) {
  const facts: string[] = [];
  const places = job.location.split(/;\s*/).filter(Boolean);
  facts.push(places.length > 2 ? `📍 ${places.length} locations` : `📍 ${job.location}`);
  if (isRemote(job.location)) facts.push("🏠 Remote option");
  const term = job.description.match(/Term: ([^.]+)\./)?.[1];
  if (term) facts.push(`🗓️ ${term}`);
  const category = job.description.match(/Category: ([^.]+)\./)?.[1];
  if (category) facts.push(`🏷️ ${category}`);
  const year = job.title.match(/\b20\d\d\b/)?.[0];
  if (!term && year) facts.push(`🗓️ ${year}`);
  return facts;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RoleDetails({ job }: { job: Job }) {
  const [info, setInfo] = useState<RoleInfo | null>(cache.get(job.id) ?? null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache.has(job.id)) return;
    let cancelled = false;
    setError("");
    (async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        cache.set(job.id, data.info);
        if (!cancelled) setInfo(data.info);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Couldn't load details.");
      }
    })();
    return () => { cancelled = true; };
  }, [job, attempt]);

  return (
    <div className="animate-fade-in mt-4 space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="flex flex-wrap gap-1.5">
        {quickFacts(job).map((f) => (
          <span key={f} className="chip bg-surface text-slate-600 ring-1 ring-slate-200">{f}</span>
        ))}
      </div>

      {!info && !error && (
        <div className="space-y-2" aria-label="Loading role details">
          <div className="skeleton h-3.5 w-11/12" />
          <div className="skeleton h-3.5 w-4/5" />
          <div className="skeleton h-3.5 w-2/3" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={() => setAttempt((a) => a + 1)} className="font-semibold underline">Try again</button>
        </p>
      )}

      {info && (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">About the role</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{info.summary}</p>
            {info.fromTitleOnly && (
              <p className="mt-2 text-xs text-amber-700">
                ⓘ This posting had few details, so this is based on the job title. Open the posting for specifics.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <List title="What you'd likely do" items={info.dayToDay} />
            <List title="What they're looking for" items={info.lookingFor} />
          </div>
          <List title="Good to know" items={info.goodToKnow} />

          <div className="rounded-xl bg-surface p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">About {job.company}</p>
            {info.company.about ? (
              <>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{info.company.about}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {info.company.source === "wikipedia" && info.company.url ? (
                    <>Source: <a href={info.company.url} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">Wikipedia</a></>
                  ) : (
                    "Source: the job posting"
                  )}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-sm text-slate-500">
                We couldn&apos;t find reliable public info about this company. Check their website before applying.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
