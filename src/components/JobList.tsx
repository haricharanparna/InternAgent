"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keywordScore } from "@/lib/jobs";
import TailorPanel from "./TailorPanel";
import CompanyLogo from "./CompanyLogo";
import InternshipDetail from "./InternshipDetail";
import ComparePanel from "./ComparePanel";
import { priorityOf } from "@/lib/priority";
import { trustOf } from "@/lib/authenticity";
import { postingFacts } from "@/lib/postingFacts";
import { KEYS, useStored, type SavedSearch } from "@/lib/prefs";
import { matchesSearch, parseSearch } from "@/lib/nlSearch";
import { hourlyPay, jobFacts, skillsMentioned } from "@/lib/jobFacts";
import { bumpUsage } from "@/lib/usage";
import { keywordMatch } from "@/lib/keywords";
import { PLACE_KEY, isNear, isRemote, locateMe, placeLabel, type Place } from "@/lib/location";
import type { Fit, Job, NextStepsPlan, Profile, ScoredJob } from "@/lib/types";
import { apiFetch, readJSON } from "@/lib/api";

const PAGE = 25;
const SEEN_KEY = "internagent.seenJobs";

// "3d ago" style age for a posting date.
export function ago(iso?: string) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 60) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

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
  onTrack: (job: ScoredJob, plan?: NextStepsPlan) => void;
  onOpen: (id: string) => void;
};

export default function JobList({ profile, trackedIds, onTrack, onOpen }: Props) {
  const [jobs, setJobs] = useState<ScoredJob[]>([]);
  const [loading, setLoading] = useState<"" | "jobs" | "score">("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [tailoring, setTailoring] = useState<Job | null>(null);
  const [detail, setDetailState] = useState<ScoredJob | null>(null);
  const [viewed, setViewed] = useStored<string[]>(KEYS.viewed, []);
  const [hidden, setHidden] = useStored<string[]>(KEYS.hidden, []);
  const [searches, setSearches] = useStored<SavedSearch[]>(KEYS.searches, []);
  const [watch, setWatch] = useStored<string[]>(KEYS.watch, []);
  const searchBox = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useStored<string[]>(KEYS.recent, []);
  const remember = (q: string) => { const t = q.trim(); if (t.length >= 3) setRecent((r) => [t, ...r.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 6)); };

  // "/" jumps to the search box (like many sites), unless you're typing or a window is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]") || document.querySelector("[role=dialog]")) return;
      const box = searchBox.current;
      if (!box || box.offsetParent === null) return; // search tab hidden
      e.preventDefault();
      box.focus();
      box.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [showHidden, setShowHidden] = useState(false);
  const [length, setLength] = useState<"" | "short" | "long">("");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  // Opening an internship also remembers it under "Recently viewed".
  const setDetail = (j: ScoredJob | null) => {
    setDetailState(j);
    if (j) setViewed((v) => [j.id, ...v.filter((x) => x !== j.id)].slice(0, 10));
  };
  const hide = (id: string) => setHidden((h) => (h.includes(id) ? h : [...h, id]));
  const [compare, setCompare] = useState<ScoredJob[]>([]);
  const [comparing, setComparing] = useState(false);
  const toggleCompare = (j: ScoredJob) => setCompare((c) => (c.some((x) => x.id === j.id) ? c.filter((x) => x.id !== j.id) : c.length >= 3 ? c : [...c, j]));
  const [place, setPlace] = useState<Place | null>(null);
  const [where, setWhere] = useState<"all" | "near" | "remote">("all");
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState("");
  const [paidOnly, setPaidOnly] = useState(false);
  const [hideSaved, setHideSaved] = useState(false);
  const [sort, setSort] = useState<"match" | "priority" | "deadline" | "newest" | "keywords" | "pay" | "company">("match");
  const [sponsorOnly, setSponsorOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  // Jobs that weren't there on the student's last search (like job-alert "new" badges).
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

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
      const res = await apiFetch("/api/jobs");
      const data = await readJSON(res);
      if (!res.ok) throw new Error(data.error);
      const ranked = (data.jobs as Job[])
        .map((j) => ({ job: j, k: keywordScore(j, terms) }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.job);
      setJobs(ranked);
      setShown(PAGE);
      try {
        const seen: string[] = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
        if (seen.length) {
          const before = new Set(seen);
          const fresh = ranked.filter((j) => !before.has(j.id)).map((j) => j.id);
          setNewIds(new Set(fresh));
          try { localStorage.setItem(KEYS.newCount, JSON.stringify({ count: fresh.length, at: new Date().toISOString() })); window.dispatchEvent(new CustomEvent("internagent:prefs", { detail: KEYS.newCount })); } catch {}
          // New postings from companies the student watches, for the notification bell.
          try {
            const watched: string[] = JSON.parse(localStorage.getItem(KEYS.watch) || "[]");
            const freshSet = new Set(fresh);
            const at = new Date().toISOString();
            const hits = watched.map((c) => ({ company: c, count: ranked.filter((j) => j.company === c && freshSet.has(j.id)).length, at })).filter((h) => h.count > 0);
            localStorage.setItem(KEYS.watchNew, JSON.stringify(hits));
            window.dispatchEvent(new CustomEvent("internagent:prefs", { detail: KEYS.watchNew }));
          } catch {}
        }
        localStorage.setItem(SEEN_KEY, JSON.stringify(ranked.map((j) => j.id)));
      } catch {}
    } catch (e) {
      setError((e as Error).message || "Could not load postings.");
    } finally {
      setLoading("");
    }
  }

  // Facts read from each posting (no AI), used by the filters and sort.
  const facts = useMemo(() => new Map(jobs.map((j) => [j.id, jobFacts(j)])), [jobs]);
  const categories = useMemo(() => {
    const count = new Map<string, number>();
    for (const f of facts.values()) if (f.category) count.set(f.category, (count.get(f.category) || 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]);
  }, [facts]);
  const matches = useMemo(() => new Map(jobs.map((j) => [j.id, keywordMatch(j, profile)])), [jobs, profile]);
  const payOf = (id: string) => hourlyPay(facts.get(id)?.pay);
  // Apply-first priority (match, eligibility, deadline, freshness, pay listed).
  const priorities = useMemo(() => new Map(jobs.map((j) => [j.id, priorityOf(j, profile)])), [jobs, profile]);
  const trust = useMemo(() => new Map(jobs.map((j) => [j.id, trustOf(j)])), [jobs]);
  // Internship length in weeks, read from the posting ("12-week", "6 months").
  const weeksOf = useMemo(() => new Map(jobs.map((j) => {
    const v = postingFacts(j).find((f) => f.key === "length")?.value || "";
    const words: Record<string, number> = { three: 3, four: 4, five: 5, six: 6, twelve: 12 };
    const first = v.split(/[–\s]/)[0].toLowerCase();
    const n = Number(first) || words[first] || 0;
    return [j.id, n ? (/month/.test(v) ? n * 4.3 : n) : 0] as const;
  })), [jobs]);
  const deadlineCount = useMemo(() => jobs.filter((j) => j.deadline).length, [jobs]);
  const ineligible = (id: string) => (priorities.get(id)?.factors.find((f) => f.label === "Eligibility")?.points ?? 20) < 10;

  // One filter for the list and for counting new matches of saved searches.
  type Filters = Pick<SavedSearch, "query" | "category" | "where" | "paidOnly" | "sponsorOnly" | "length" | "eligibleOnly">;
  const makeFilter = (o: Filters) => {
    const q = o.query.trim().toLowerCase();
    const parsed = parseSearch(q);
    return (j: ScoredJob) => {
      if (q && !matchesSearch(j, parsed)) return false;
      if (o.category && facts.get(j.id)?.category !== o.category) return false;
      if (o.paidOnly && !facts.get(j.id)?.pay) return false;
      const weeks = weeksOf.get(j.id) || 0;
      if (o.length === "short" && !(weeks > 0 && weeks <= 13)) return false;
      if (o.length === "long" && !(weeks > 13)) return false;
      if (o.eligibleOnly && ineligible(j.id)) return false;
      if (o.sponsorOnly && !/offers sponsorship/i.test(facts.get(j.id)?.sponsorship || "")) return false;
      if (o.where === "remote") return isRemote(j.location);
      if (o.where === "near" && place) return isNear(j.location, place) || isRemote(j.location);
      return true;
    };
  };
  const newBySearch = useMemo(() => {
    const fresh = jobs.filter((j) => newIds.has(j.id) && !hidden.includes(j.id));
    return new Map(searches.map((s) => [s.id, fresh.length ? fresh.filter(makeFilter(s)).length : 0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searches, jobs, newIds, hidden, facts, weeksOf, priorities, place]);

  // Tell the bell which saved searches have new matches (once per search load).
  useEffect(() => {
    if (!newIds.size) return;
    const at = new Date().toISOString().slice(0, 10);
    const hits = searches.map((s) => ({ name: s.name, count: newBySearch.get(s.id) || 0, at })).filter((h) => h.count > 0);
    try { localStorage.setItem(KEYS.searchNew, JSON.stringify(hits)); window.dispatchEvent(new CustomEvent("internagent:prefs", { detail: KEYS.searchNew })); } catch {}
  }, [newBySearch, newIds, searches]);

  const visible = useMemo(() => {
    const keep = makeFilter({ query, category, where, paidOnly, sponsorOnly, length, eligibleOnly });
    const list = jobs.filter((j) => {
      if (hideSaved && trackedIds.has(j.id)) return false;
      if (!showHidden && hidden.includes(j.id)) return false;
      if (newOnly && !newIds.has(j.id)) return false;
      return keep(j);
    });
    if (sort === "priority") return [...list].sort((a, b) => (priorities.get(b.id)?.score ?? 0) - (priorities.get(a.id)?.score ?? 0));
    if (sort === "deadline") return [...list].sort((a, b) => (a.deadline || "9999").localeCompare(b.deadline || "9999"));
    if (sort === "newest") return [...list].sort((a, b) => (b.postedAt || "").localeCompare(a.postedAt || ""));
    if (sort === "keywords") return [...list].sort((a, b) => (matches.get(b.id)?.pct ?? -1) - (matches.get(a.id)?.pct ?? -1));
    if (sort === "pay") return [...list].sort((a, b) => payOf(b.id) - payOf(a.id));
    if (sort === "company") return [...list].sort((a, b) => a.company.localeCompare(b.company));
    return [...list].sort((a, b) => (b.fit?.score ?? -1) - (a.fit?.score ?? -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, query, where, place, category, paidOnly, hideSaved, sort, facts, trackedIds, sponsorOnly, newOnly, newIds, matches, priorities, hidden, showHidden, length, eligibleOnly, weeksOf]);

  async function scoreWithAI() {
    setError("");
    setLoading("score");
    try {
      const unscored = visible.filter((j) => !j.fit);
      const res = await apiFetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, jobs: unscored }),
      });
      const data = await readJSON(res);
      if (!res.ok) throw new Error(data.error);
      const byId = new Map((data.fits as Fit[]).map((f) => [f.id, f]));
      bumpUsage("postingsScored", byId.size);
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
            ref={searchBox}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
            onBlur={() => remember(query)}
            onKeyDown={(e) => { if (e.key === "Enter") remember(query); if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); setShown(PAGE); } }}
            aria-label="Search internships (press / to jump here)"
            aria-keyshortcuts="/"
            placeholder={'Try "remote AI internships paying $20/hr" or a company or city'}
            aria-describedby="search-understood"
            className="w-full rounded-md border border-slate-300 bg-surface py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </div>
        {!query.trim() && recent.length > 0 && (
          <p className="order-last flex basis-full flex-wrap items-center gap-1.5 text-xs text-slate-500">
            Recent:
            {recent.map((r) => <button key={r} onClick={() => { setQuery(r); setShown(PAGE); }} className="rounded-md border border-slate-200 px-2 py-0.5 text-slate-700 hover:border-slate-400">{r}</button>)}
            <button onClick={() => setRecent([])} className="underline underline-offset-2">Clear</button>
          </p>
        )}
        {query.trim() && (
          <p id="search-understood" className="order-last basis-full text-xs text-slate-500">
            Understood as: {parseSearch(query).chips.map((c) => <span key={c} className="tag tag-soft mr-1">{c}</span>)}
          </p>
        )}
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Field</span>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }} className="field w-auto max-w-[14rem] py-1.5">
            <option value="">All fields</option>
            {categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field w-auto py-1.5">
            <option value="match">Best match</option>
            <option value="priority">Apply first (priority)</option>
            <option value="deadline">Deadline (soonest first; {deadlineCount} list one)</option>
            <option value="newest">Newest</option>
            <option value="keywords">Keyword match</option>
            <option value="pay">Highest pay listed</option>
            <option value="company">Company A–Z</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={paidOnly} onChange={(e) => { setPaidOnly(e.target.checked); setShown(PAGE); }} className="h-4 w-4 accent-blue-600" /> Pay listed</label>
        <label className="flex items-center gap-1.5" title="Only listings that say they sponsor work visas (from the SimplifyJobs list)"><input type="checkbox" checked={sponsorOnly} onChange={(e) => { setSponsorOnly(e.target.checked); setShown(PAGE); }} className="h-4 w-4 accent-blue-600" /> Sponsors visas</label>
        {newIds.size > 0 && (
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={newOnly} onChange={(e) => { setNewOnly(e.target.checked); setShown(PAGE); }} className="h-4 w-4 accent-blue-600" /> New since last visit ({newIds.size})</label>
        )}
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={hideSaved} onChange={(e) => setHideSaved(e.target.checked)} className="h-4 w-4 accent-blue-600" /> Hide saved</label>
        <label className="flex items-center gap-2">
          <span className="text-slate-500">Length</span>
          <select value={length} onChange={(e) => { setLength(e.target.value as typeof length); setShown(PAGE); }} className="field w-auto py-1.5">
            <option value="">Any (or not stated)</option>
            <option value="short">Up to 13 weeks</option>
            <option value="long">Longer (4+ months)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5" title="Hides roles whose graduation window excludes your year, or whose title says PhD/MBA/Master's when your resume doesn't"><input type="checkbox" checked={eligibleOnly} onChange={(e) => { setEligibleOnly(e.target.checked); setShown(PAGE); }} className="h-4 w-4 accent-blue-600" /> Hide roles I may not qualify for</label>
      </div>

      <SavedSearches
        searches={searches}
        newCounts={newBySearch}
        onSave={() => {
          const parts = [query && `"${query}"`, category, where !== "all" && (where === "remote" ? "Remote" : "Near me"), paidOnly && "Pay listed", sponsorOnly && "Visa", length && (length === "short" ? "≤13 weeks" : "4+ months"), eligibleOnly && "Eligible"].filter(Boolean);
          const s: SavedSearch = { id: String(Date.now()), name: parts.join(" · ") || "All internships", query, category, where, paidOnly, sponsorOnly, length, eligibleOnly, sort };
          setSearches((list) => [s, ...list.filter((x) => x.name !== s.name)].slice(0, 8));
        }}
        onApply={(s) => { setQuery(s.query); setCategory(s.category); setWhere(s.where === "near" && !place ? "all" : s.where); setPaidOnly(s.paidOnly); setSponsorOnly(s.sponsorOnly); setLength(s.length); setEligibleOnly(s.eligibleOnly); setSort(s.sort as typeof sort); setShown(PAGE); }}
        onDelete={(id) => setSearches((list) => list.filter((x) => x.id !== id))}
      />
      {watch.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-slate-500">Companies you watch:</span>
          {watch.map((c) => {
            const open = jobs.filter((j) => j.company === c);
            const fresh = open.filter((j) => newIds.has(j.id)).length;
            return (
              <span key={c} className="inline-flex items-center overflow-hidden rounded-md border border-slate-200">
                <button onClick={() => { setQuery(c); setShown(PAGE); }} className="px-2 py-1 text-slate-700 hover:bg-slate-50" title={`Show ${c}'s internships`}>
                  {c} <span className="text-slate-500">· {open.length} open</span>{fresh > 0 && <b className="text-emerald-700"> · {fresh} new</b>}
                </button>
                <button onClick={() => setWatch((w) => w.filter((x) => x !== c))} aria-label={`Stop watching ${c}`} className="border-l border-slate-200 px-1.5 py-1 text-slate-400 hover:text-slate-700">×</button>
              </span>
            );
          })}
        </div>
      )}
      {viewed.some((id) => jobs.some((j) => j.id === id)) && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-slate-500">Recently viewed:</span>
          {viewed.map((id) => jobs.find((j) => j.id === id)).filter((j): j is ScoredJob => !!j).slice(0, 6).map((j) => (
            <button key={j.id} onClick={() => setDetail(j)} className="max-w-[16rem] truncate rounded-md border border-slate-200 px-2 py-1 text-slate-700 hover:border-slate-400">{j.company}: {j.title}</button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm text-slate-500">
        <span>
          <b className="text-slate-800">{visible.length}</b> internships from <b className="text-slate-800">{companies}</b> companies
        </span>
        <span className="flex items-center gap-3">
          {hidden.length > 0 && <button onClick={() => setShowHidden((s) => !s)} className="underline underline-offset-2">{showHidden ? "Hide hidden" : `${hidden.length} hidden · show`}</button>}
          <span>{scoredCount} scored by AI</span>
        </span>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {visible.length > 0 && <ApplyFirst jobs={visible.filter((j) => !trackedIds.has(j.id) && !hidden.includes(j.id))} priorities={priorities} onOpen={setDetail} onSortPriority={() => { setSort("priority"); setShown(PAGE); }} sortedByPriority={sort === "priority"} />}

      {visible.length === 0 && (
        <div className="card p-6 text-center text-sm text-slate-600">
          No internships match these filters.{" "}
          <button
            onClick={() => { setQuery(""); setCategory(""); setPaidOnly(false); setHideSaved(false); setSponsorOnly(false); setNewOnly(false); setWhere("all"); setLength(""); setEligibleOnly(false); }}
            className="font-medium text-blue-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}
      <ul className="divide-y divide-slate-200 border-y border-slate-200">
        {visible.slice(0, shown).map((j, i) => {
          const tracked = trackedIds.has(j.id);
          const f = jobFacts(j);
          const mine = skillsMentioned(j, profile.skills);
          const km = matches.get(j.id);
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
                    <span title={trust.get(j.id)?.detail} className={`tag ${trust.get(j.id)?.level === "suspicious" ? "border-rose-400 bg-rose-50 text-rose-700" : trust.get(j.id)?.level === "official" ? "tag-accent" : "tag-soft"}`}>{trust.get(j.id)?.level === "suspicious" ? "⚠ " : trust.get(j.id)?.level === "official" ? "✓ " : ""}{trust.get(j.id)?.label}</span>
                    {f.category && <span className="tag tag-soft">{f.category}</span>}
                    {f.workplace && <span className="tag tag-soft">{f.workplace}</span>}
                    {newIds.has(j.id) && <span className="tag bg-emerald-100 text-emerald-800">New</span>}
                    {watch.includes(j.company) && <span className="tag bg-amber-100 text-amber-800" title="You're watching this company">★ Watching</span>}
                    {(() => {
                      if (!j.deadline) return null;
                      const days = Math.ceil((new Date(j.deadline.slice(0, 10) + "T23:59").getTime() - Date.now()) / 86_400_000);
                      return days >= 0 && days <= 14 ? <span className={`tag ${days <= 3 ? "bg-rose-100 text-rose-800" : "bg-amber-50 text-amber-800"}`}>⏰ {days === 0 ? "Closes today" : `Closes in ${days} day${days === 1 ? "" : "s"}`}</span> : null;
                    })()}
                    {j.postedAt && <span className="text-xs text-slate-500" title={`Posted or updated ${new Date(j.postedAt).toLocaleDateString()}`}>· {ago(j.postedAt)}</span>}
                  </div>
                  <h3 className="mt-2 text-xl font-medium leading-snug text-slate-900">
                    <button onClick={() => setDetail(j)} className="text-left hover:text-blue-700 hover:underline hover:decoration-blue-300 hover:underline-offset-4">{j.title}</button>
                  </h3>
                  {f.snippet ? (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{f.snippet}</p>
                  ) : (
                    <p className="mt-1.5 text-sm text-slate-500">
                      This listing only includes the title, location and term. Open <b className="font-medium text-slate-600">Details &amp; next steps</b> for the key facts and a plain-English explanation.
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
                  {km ? (
                    <div className="mt-3 rounded-md border border-slate-200 px-3 py-2.5" title="Hard skills the posting names, compared with your resume. Plain text matching, no AI.">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="shrink-0 font-medium text-slate-800">Keyword match {km.pct}%</span>
                        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200">
                          <span className={`block h-full rounded-full ${km.pct >= 70 ? "bg-emerald-500" : km.pct >= 40 ? "bg-amber-500" : "bg-rose-400"}`} style={{ width: `${km.pct}%` }} />
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">{km.matched.length}/{km.matched.length + km.missing.length}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {km.matched.slice(0, 8).map((m) => <span key={m} className="chip bg-emerald-100/70 text-emerald-800">✓ {m}</span>)}
                        {km.missing.slice(0, 6).map((m) => <span key={m} className="chip bg-slate-100 text-slate-600">{m}</span>)}
                      </div>
                      {km.missing.length > 0 && km.pct < 70 && (
                        <p className="mt-1.5 text-xs text-slate-500">If you really have the grey ones, add them to your resume in the words the posting uses. If not, Tailor shows how to cover the gap honestly.</p>
                      )}
                    </div>
                  ) : mine.length > 0 && (
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
                      onClick={() => (tracked ? onOpen(j.id) : onTrack(j))}
                      className={`btn-secondary ${tracked ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
                    >
                      {tracked ? "✓ Saved · Next steps" : "＋ Save & get next steps"}
                    </button>
                    <button onClick={() => setDetail(j)} className="btn-secondary">Details &amp; next steps →</button>
                    {hidden.includes(j.id) ? (
                      <button onClick={() => setHidden((h) => h.filter((x) => x !== j.id))} className="text-sm text-slate-500 underline underline-offset-2">Unhide</button>
                    ) : (
                      <button onClick={() => hide(j.id)} title="Not for me: hide this internship" className="text-sm text-slate-500 underline underline-offset-2">Not for me</button>
                    )}
                    <label className={`flex cursor-pointer items-center gap-1.5 text-sm text-slate-600 ${compare.length >= 3 && !compare.some((x) => x.id === j.id) ? "opacity-50" : ""}`}>
                      <input type="checkbox" checked={compare.some((x) => x.id === j.id)} onChange={() => toggleCompare(j)} disabled={compare.length >= 3 && !compare.some((x) => x.id === j.id)} className="h-4 w-4 accent-blue-600" /> Compare
                    </label>
                  </div>
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
      {compare.length > 0 && !detail && !comparing && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-surface px-4 py-2 shadow-lg">
            <span className="text-sm text-slate-700">{compare.length} of 3 selected</span>
            <button onClick={() => setComparing(true)} disabled={compare.length < 2} className="btn-primary px-4 py-1.5 disabled:opacity-50">Compare{compare.length < 2 ? " (pick 2+)" : ""}</button>
            <button onClick={() => setCompare([])} className="text-sm text-slate-500 underline underline-offset-2">Clear</button>
          </div>
        </div>
      )}
      {comparing && compare.length > 0 && !detail && (
        <ComparePanel jobs={compare} profile={profile} onOpen={(j) => setDetail(j)} onRemove={(id) => setCompare((c) => c.filter((x) => x.id !== id))} onClose={() => setComparing(false)} />
      )}
      {detail && !tailoring && (
        <InternshipDetail
          job={detail}
          profile={profile}
          allJobs={jobs}
          tracked={trackedIds.has(detail.id)}
          onSave={(j, plan) => { setDetail(null); onTrack(j, plan); }}
          onOpenSaved={(id) => { setDetail(null); onOpen(id); }}
          onTailor={(j) => setTailoring(j)}
          onOpenJob={setDetail}
          compared={compare.some((x) => x.id === detail.id)}
          onCompare={() => toggleCompare(detail)}
          onClose={() => setDetail(null)}
          onHide={() => { hide(detail.id); setDetail(null); }}
        />
      )}
    </section>
  );
}

// "Apply to these first": the top 3 unsaved internships by priority, each with
// the factor that helped it most, so the ranking is never a black box.
function ApplyFirst({ jobs, priorities, onOpen, onSortPriority, sortedByPriority }: {
  jobs: ScoredJob[]; priorities: Map<string, ReturnType<typeof priorityOf>>; onOpen: (j: ScoredJob) => void; onSortPriority: () => void; sortedByPriority: boolean;
}) {
  const top = [...jobs].sort((a, b) => (priorities.get(b.id)?.score ?? 0) - (priorities.get(a.id)?.score ?? 0)).slice(0, 3);
  if (!top.length) return null;
  return (
    <section aria-labelledby="apply-first-h" className="rounded-md border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="apply-first-h" className="text-sm font-semibold text-slate-900">Apply to these first</h2>
        {!sortedByPriority && <button onClick={onSortPriority} className="text-xs font-medium text-blue-700 underline underline-offset-2">Sort the whole list this way</button>}
      </div>
      <ol className="mt-2 space-y-1.5">
        {top.map((j, i) => {
          const p = priorities.get(j.id)!;
          const strong = [...p.factors].sort((a, b) => b.points / b.max - a.points / a.max)[0];
          return (
            <li key={j.id}>
              <button onClick={() => onOpen(j)} className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-blue-100/60">
                <span className="shrink-0 font-semibold tabular-nums text-blue-700">{p.score}</span>
                <span className="min-w-0 flex-1"><b className="font-medium text-slate-900">{i + 1}. {j.title}</b> <span className="text-slate-600">at {j.company}</span><span className="block text-xs text-slate-500">{strong.label}: {strong.note}{p.warnings.length ? ` · ⚠ ${p.warnings[0]}` : ""}</span></span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-500">Priority = match (40) + eligibility (20) + deadline (20) + freshness (10) + pay listed (10). Open one to see its breakdown.</p>
    </section>
  );
}

// Saved searches: one click re-applies a set of filters.
function SavedSearches({ searches, newCounts, onSave, onApply, onDelete }: {
  searches: SavedSearch[]; newCounts: Map<string, number>; onSave: () => void; onApply: (s: SavedSearch) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm">
      <button onClick={onSave} className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-slate-600 hover:border-slate-500">☆ Save this search</button>
      {searches.map((s) => (
        <span key={s.id} className="inline-flex items-center rounded-md border border-slate-200 bg-surface">
          <button onClick={() => onApply(s)} className="max-w-[14rem] truncate px-2 py-1 text-slate-700 hover:text-blue-700">★ {s.name}{(newCounts.get(s.id) || 0) > 0 && <b className="ml-1 text-emerald-700">· {newCounts.get(s.id)} new</b>}</button>
          <button onClick={() => onDelete(s.id)} aria-label={`Delete saved search ${s.name}`} className="px-1.5 py-1 text-slate-400 hover:text-slate-700">×</button>
        </span>
      ))}
    </div>
  );
}
