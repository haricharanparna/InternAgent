"use client";

import { useEffect, useState } from "react";
import { FOLLOW_UP_DAYS, STATUSES, followUpDue, type Status, type TrackedApp } from "@/lib/tracker";
import { buildIcs, download, eventsFor, toCsv } from "@/lib/calendar";
import AddJobForm from "./AddJobForm";
import type { Profile, ScoredJob } from "@/lib/types";
import { keywordMatch } from "@/lib/keywords";
import { RATING_LABELS, offerScore, type OfferDetails, type OfferRatings } from "@/lib/offers";
import { postingFacts } from "@/lib/postingFacts";
import { hourlyPay } from "@/lib/jobFacts";

const GOAL_KEY = "internagent.weeklyGoal";

type Props = {
  apps: TrackedApp[];
  onUpdate: (id: string, patch: Partial<TrackedApp>) => void;
  onRemove: (id: string) => void;
  onBrowse: () => void;
  onOpen: (id: string) => void;
  onAdd: (job: ScoredJob) => void;
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

// Whole days from today until a date (negative = past).
const daysUntil = (iso: string) => {
  const d = new Date(iso.length <= 10 ? iso + "T00:00" : iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
};
const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : n < 0 ? `${-n} day${n === -1 ? "" : "s"} ago` : `in ${n} days`);

export default function Tracker({ apps, onUpdate, onRemove, onBrowse, onOpen, onAdd }: Props) {
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [view, setView] = useState<"board" | "table">("board");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [goal, setGoal] = useState(5);
  useEffect(() => {
    try { const g = Number(localStorage.getItem(GOAL_KEY)); if (g > 0) setGoal(g); } catch {}
  }, []);
  const changeGoal = (g: number) => {
    const v = Math.max(1, Math.min(50, g || 1));
    setGoal(v);
    try { localStorage.setItem(GOAL_KEY, String(v)); } catch {}
  };
  const addForm = adding && <AddJobForm apps={apps} onOpen={(id) => { setAdding(false); onOpen(id); }} onAdd={(j) => { onAdd(j); setAdding(false); }} onCancel={() => setAdding(false)} />;

  if (apps.length === 0) {
    return (
      <section className="card p-12 text-center"><div className="text-4xl">📋</div>
        <p className="mt-3 font-serif text-2xl">No applications yet</p>
        <p className="mt-1 text-sm text-slate-600">Save internships from your search, or add one you found anywhere else.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={onBrowse} className="btn-primary">Find internships</button>
          <button onClick={() => setAdding(true)} className="btn-secondary">＋ Add a job from anywhere</button>
        </div>
        {addForm && <div className="mt-6 text-left">{addForm}</div>}
      </section>
    );
  }

  const sent = apps.filter((a) => a.status !== "saved" && !(a.status === "withdrawn" && !a.appliedAt));
  const heardBack = sent.filter((a) => ["assessment", "interview", "offer", "rejected"].includes(a.status));
  const due = apps.filter((a) => followUpDue(a));
  const stats = [
    { label: "Tracked", value: apps.length },
    { label: "Applied", value: sent.length },
    { label: "Interviews", value: apps.filter((a) => a.status === "interview" || a.status === "offer").length },
    { label: "Response rate", value: sent.length ? `${Math.round((heardBack.length / sent.length) * 100)}%` : "—" },
  ];

  const events = apps.flatMap(eventsFor);
  const q = search.trim().toLowerCase();
  const shown = q ? apps.filter((a) => `${a.title} ${a.company} ${a.location} ${a.notes}`.toLowerCase().includes(q)) : apps;
  const upcoming = apps
    .flatMap((a) => [
      a.interviewAt && { a, label: "Interview", when: a.interviewAt },
      a.deadline && a.status === "saved" && { a, label: "Deadline", when: a.deadline },
    ])
    .filter((x): x is { a: TrackedApp; label: string; when: string } => !!x && daysUntil(x.when) >= 0 && daysUntil(x.when) <= 14)
    .sort((x, y) => x.when.localeCompare(y.when));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-serif text-3xl font-medium text-slate-900">Your applications</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setAdding(true)} className="btn-primary px-3 py-1.5">＋ Add a job</button>
          <button
            onClick={() => download("internagent-dates.ics", buildIcs(events), "text/calendar")}
            disabled={events.length === 0}
            title={events.length ? "Deadlines, interviews and follow-up days" : "Add a deadline or interview date to a card first"}
            className="btn-secondary px-3 py-1.5"
          >
            📅 Add {events.length || ""} date{events.length === 1 ? "" : "s"} to my calendar
          </button>
          <button onClick={() => download("internagent-applications.csv", toCsv(apps), "text/csv")} className="btn-secondary px-3 py-1.5">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {addForm}

      <WeeklyGoal apps={apps} goal={goal} onGoal={changeGoal} />

      {upcoming.length > 0 && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-800">
          <b>Coming up:</b>{" "}
          {upcoming.map((u, i) => (
            <span key={u.a.id + u.label}>
              {i > 0 && " · "}
              {u.label} with {u.a.company} {inDays(daysUntil(u.when))}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card animate-fade-up p-4">
            <p className="font-serif text-4xl text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <Offers apps={apps} onUpdate={onUpdate} />
      <Pipeline apps={apps} />

      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your applications" aria-label="Search your applications" className="field w-auto min-w-0 flex-1 py-1.5 sm:max-w-xs" />
        <div role="group" aria-label="View" className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {(["board", "table"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3 py-1.5 ${view === v ? "bg-blue-600 text-white" : "bg-surface text-slate-700"}`}>{v === "board" ? "Board" : "Table"}</button>
          ))}
        </div>
        {q && <span className="text-sm text-slate-500">{shown.length} of {apps.length}</span>}
      </div>

      {due.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Time to follow up on {due.length} application{due.length > 1 ? "s" : ""}.</b> No reply after{" "}
          {FOLLOW_UP_DAYS} days. A short, polite email to the recruiter can help: {due.map((a) => a.company).join(", ")}.
        </div>
      )}

      {view === "table" ? <AppTable apps={shown} onUpdate={onUpdate} onOpen={onOpen} /> : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        {STATUSES.map((col) => {
          const items = shown.filter((a) => a.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) onUpdate(id, { status: col.id });
              }}
              className={`min-h-24 rounded-2xl p-2 transition ${dragOver === col.id ? "bg-blue-100 ring-2 ring-blue-300" : "bg-slate-100/80"}`}
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${col.color}`}>{col.label}</span>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <ul className="space-y-2">
                {items.map((a) => (
                  <Card key={a.id} app={a} onUpdate={onUpdate} onRemove={onRemove} onOpen={onOpen} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      )}
      <p className="text-xs text-slate-400">Drag cards between columns, or use the dropdown on each card. Saved only in this browser.</p>
    </section>
  );
}

function Card({ app, onUpdate, onRemove, onOpen }: { app: TrackedApp; onUpdate: Props["onUpdate"]; onRemove: Props["onRemove"]; onOpen: Props["onOpen"] }) {
  const [open, setOpen] = useState(false);
  const due = followUpDue(app);

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", app.id)}
      className="animate-fade-up cursor-grab rounded-xl border border-slate-200/70 bg-surface p-3 text-sm shadow-sm transition hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <a href={app.url} target="_blank" rel="noreferrer" className="font-medium leading-snug hover:text-blue-600">
          {app.title}
        </a>
        {app.fitScore !== undefined && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{app.fitScore}%</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{app.company}</p>
      <p className="mt-1 text-xs text-slate-400">
        {app.appliedAt ? `Applied ${fmtDate(app.appliedAt)}` : `Saved ${fmtDate(app.savedAt)}`}
      </p>
      {due && <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">Follow-up due</p>}
      {app.interviewAt && daysUntil(app.interviewAt) >= 0 && (
        <p className="mt-1.5 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">
          Interview {inDays(daysUntil(app.interviewAt))}, {new Date(app.interviewAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
      {app.deadline && app.status === "saved" && (
        <p className={`mt-1.5 rounded px-2 py-1 text-xs ${daysUntil(app.deadline) < 0 ? "bg-slate-100 text-slate-500" : daysUntil(app.deadline) <= 3 ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-600"}`}>
          {daysUntil(app.deadline) < 0 ? "Deadline passed" : `Apply ${inDays(daysUntil(app.deadline))}`}
        </p>
      )}
      <button
        onClick={() => onOpen(app.id)}
        className="mt-2 w-full rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-left text-xs font-medium text-blue-700 hover:bg-blue-100"
      >
        {app.plan && app.plan.status === app.status
          ? `✓ ${(app.plan.done || []).length}/${app.plan.steps.length} next steps · emails →`
          : "Next steps & emails →"}
      </button>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <select
          value={app.status}
          onChange={(e) => onUpdate(app.id, { status: e.target.value as Status })}
          aria-label="Status"
          className="min-w-[5.5rem] flex-1 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200"
        >
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-xs text-slate-500 hover:text-slate-800">
          {open ? "Hide" : app.notes || app.deadline || app.interviewAt ? "Details•" : "Details"}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <label className="block text-xs text-slate-500">
            Application deadline
            <input type="date" value={app.deadline || ""} onChange={(e) => onUpdate(app.id, { deadline: e.target.value || undefined })} className="mt-0.5 w-full rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200" />
          </label>
          <label className="block text-xs text-slate-500">
            Interview date and time
            <input type="datetime-local" value={app.interviewAt || ""} onChange={(e) => onUpdate(app.id, { interviewAt: e.target.value || undefined, ...(e.target.value && app.status !== "offer" && app.status !== "rejected" && app.status !== "withdrawn" ? { status: "interview" as Status } : {}) })} className="mt-0.5 w-full rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200" />
          </label>
          <textarea
            value={app.notes}
            onChange={(e) => onUpdate(app.id, { notes: e.target.value })}
            placeholder="Recruiter name, interview date, what to prep…"
            rows={3}
            className="w-full rounded-md bg-slate-50 p-2 text-xs ring-1 ring-slate-200 focus:ring-blue-500 focus:outline-none"
          />
          <button onClick={() => onRemove(app.id)} className="text-xs text-rose-600 hover:underline">
            Remove from tracker
          </button>
        </div>
      )}
    </li>
  );
}

// A weekly application goal, like the goals in job-search trackers.
function WeeklyGoal({ apps, goal, onGoal }: { apps: TrackedApp[]; goal: number; onGoal: (g: number) => void }) {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const done = apps.filter((a) => a.appliedAt && new Date(a.appliedAt).getTime() >= weekAgo).length;
  const pct = Math.min(100, Math.round((done / goal) * 100));
  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
      <span className="font-medium text-slate-800">Last 7 days: {done} of {goal} applications</span>
      <span className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={goal} aria-label="Weekly goal">
        <span className={`block h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
      </span>
      <label className="flex items-center gap-1.5 text-slate-500">
        Weekly goal
        <input type="number" min={1} max={50} value={goal} onChange={(e) => onGoal(Number(e.target.value))} className="w-14 rounded-md border border-slate-300 bg-surface px-2 py-0.5 text-slate-800" />
      </label>
      {pct >= 100 && <span className="text-emerald-700">Goal met 🎉</span>}
    </div>
  );
}

// Table view: every application in one sortable-at-a-glance list.
function AppTable({ apps, onUpdate, onOpen }: { apps: TrackedApp[]; onUpdate: (id: string, p: Partial<TrackedApp>) => void; onOpen: (id: string) => void }) {
  if (!apps.length) return <p className="text-sm text-slate-500">No applications match.</p>;
  const rows = [...apps].sort((a, b) => (b.appliedAt || b.savedAt).localeCompare(a.appliedAt || a.savedAt));
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>{["Company", "Role", "Stage", "Fit", "Applied", "Deadline", "Interview", "Steps", "Resume", ""].map((h) => <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="px-3 py-2 font-medium text-slate-900">{a.company}</td>
              <td className="max-w-[16rem] truncate px-3 py-2 text-slate-700" title={a.title}>{a.title}</td>
              <td className="px-3 py-2">
                <select value={a.status} onChange={(e) => onUpdate(a.id, { status: e.target.value as Status })} aria-label={`Stage for ${a.title}`} className="rounded-md border border-slate-300 bg-surface px-1.5 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </td>
              <td className="px-3 py-2 tabular-nums text-slate-700">{a.fitScore ?? "—"}</td>
              <td className="px-3 py-2 text-slate-700">{a.appliedAt?.slice(0, 10) || "—"}</td>
              <td className="px-3 py-2 text-slate-700">{a.deadline || "—"}</td>
              <td className="px-3 py-2 text-slate-700">{a.interviewAt?.replace("T", " ") || "—"}</td>
              <td className="px-3 py-2 tabular-nums text-slate-700">{a.plan ? `${(a.plan.done || []).length}/${a.plan.steps.length}` : "—"}</td>
              <td className="px-3 py-2 text-slate-700">{a.resumeUsed ? (a.resumeUsed.kind === "original" ? "Original" : `Tailored ${a.resumeUsed.at?.slice(5, 10).replace("-", "/")}`) : "—"}</td>
              <td className="px-3 py-2"><button onClick={() => onOpen(a.id)} className="text-blue-700 underline underline-offset-2">Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pipeline analytics: how far applications get, how many you send each week,
// and which skills your saved postings ask for that your resume doesn't show.
function Pipeline({ apps }: { apps: TrackedApp[] }) {
  const sent = apps.filter((a) => a.appliedAt);
  const stage = (ids: string[]) => sent.filter((a) => ids.includes(a.status)).length;
  const funnel = [
    { label: "Applied", n: sent.length },
    { label: "Heard back", n: stage(["assessment", "interview", "offer", "rejected"]) },
    { label: "Interview", n: stage(["interview", "offer"]) },
    { label: "Offer", n: stage(["offer"]) },
  ];
  const week = 7 * 86_400_000;
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => sent.filter((a) => { const t = now - new Date(a.appliedAt!).getTime(); return t >= (7 - i) * week && t < (8 - i) * week; }).length);
  const maxWeek = Math.max(1, ...weeks);
  const gaps = new Map<string, number>();
  // AI fit scores when the job was scored; otherwise the free keyword match on the saved posting.
  let profile: Profile | null = null;
  try { profile = JSON.parse(localStorage.getItem("internagent.profile") || "null"); } catch {}
  for (const a of apps) {
    const missing = a.missing?.length ? a.missing
      : profile && a.description ? keywordMatch({ id: a.id, title: a.title, company: a.company, location: a.location, url: a.url, source: "greenhouse", description: a.description }, profile)?.missing || [] : [];
    for (const m of missing) gaps.set(m, (gaps.get(m) || 0) + 1);
  }
  const topGaps = [...gaps.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
  if (!sent.length && !topGaps.length) return null;
  return (
    <details className="rounded-md border border-slate-200 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">Your pipeline</summary>
      <div className="mt-3 grid gap-6 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How far applications get</p>
          <ul className="mt-2 space-y-1.5">
            {funnel.map((f, i) => (
              <li key={f.label} className="text-sm">
                <div className="flex justify-between"><span className="text-slate-700">{f.label}</span><span className="tabular-nums text-slate-900">{f.n}{i > 0 && funnel[i - 1].n ? <span className="text-slate-500"> ({Math.round((f.n / funnel[i - 1].n) * 100)}%)</span> : null}</span></div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-500" style={{ width: `${funnel[0].n ? (f.n / funnel[0].n) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applications per week (last 8)</p>
          <div className="mt-2 flex h-20 items-end gap-1" role="img" aria-label={`Applications per week, oldest to newest: ${weeks.join(", ")}`}>
            {weeks.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                <span className="text-[10px] tabular-nums text-slate-500">{n || ""}</span>
                <div className="w-full rounded-t bg-blue-500" style={{ height: `${(n / maxWeek) * 56}px`, minHeight: n ? 3 : 1, opacity: n ? 1 : 0.25 }} />
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Oldest on the left, this week on the right.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most-asked skills you don&apos;t show</p>
          {topGaps.length ? (
            <ul className="mt-2 space-y-1 text-sm">{topGaps.map(([s, n]) => <li key={s} className="flex justify-between"><span className="text-slate-700">{s}</span><span className="tabular-nums text-slate-500">{n} posting{n === 1 ? "" : "s"}</span></li>)}</ul>
          ) : <p className="mt-2 text-sm text-slate-500">Save internships with full postings to see this.</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Percentages compare each step with the one before. Small numbers swing a lot, so read them as a rough guide.</p>
    </details>
  );
}

// Offer comparison: pay read from the posting (you can correct it) plus your own
// 1–5 ratings. Plain math, shown in full, so the decision stays yours.
function Offers({ apps, onUpdate }: { apps: TrackedApp[]; onUpdate: (id: string, p: Partial<TrackedApp>) => void }) {
  const offers = apps.filter((a) => a.status === "offer");
  if (!offers.length) return null;
  const postedPay = (a: TrackedApp) => {
    const pay = postingFacts({ id: a.id, title: a.title, company: a.company, location: a.location, url: a.url, source: "greenhouse", description: a.description || "" }).find((f) => f.key === "pay")?.value;
    return pay ? Math.round(hourlyPay(pay)) || undefined : undefined;
  };
  const details = (a: TrackedApp): OfferDetails => ({ ...a.offer, pay: a.offer?.pay ?? postedPay(a) });
  const set = (a: TrackedApp, patch: Partial<OfferDetails>) => onUpdate(a.id, { offer: { ...details(a), ...patch } });
  const best = Math.max(0, ...offers.map((a) => details(a).pay || 0));
  const scores = offers.map((a) => offerScore(details(a), best));
  const top = offers.length > 1 ? Math.max(...scores) : -1;
  const keys = Object.keys(RATING_LABELS) as (keyof OfferRatings)[];
  return (
    <section className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4">
      <h2 className="font-semibold text-slate-900">{offers.length > 1 ? `Compare your ${offers.length} offers` : "Your offer"}</h2>
      <p className="mt-0.5 text-sm text-slate-600">Rate each offer 1–5 on what matters to you. The score is 30% hourly pay (against your best offer) and 70% your ratings.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th scope="col" className="py-1.5 pr-3 font-semibold"> </th>
              {offers.map((a) => <th key={a.id} scope="col" className="py-1.5 pr-3 font-semibold normal-case text-slate-900">{a.company}<span className="block text-xs font-normal text-slate-500">{a.title}</span></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100">
            <tr>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-700">Pay ($/hour)</th>
              {offers.map((a) => <td key={a.id} className="py-2 pr-3"><input type="number" min={0} value={details(a).pay ?? ""} onChange={(e) => set(a, { pay: e.target.value ? Number(e.target.value) : undefined })} aria-label={`Hourly pay at ${a.company}`} className="w-24 rounded-md border border-slate-300 bg-surface px-2 py-1" /></td>)}
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-700">Start date</th>
              {offers.map((a) => <td key={a.id} className="py-2 pr-3"><input type="date" value={details(a).start || ""} onChange={(e) => set(a, { start: e.target.value || undefined })} aria-label={`Start date at ${a.company}`} className="rounded-md border border-slate-300 bg-surface px-2 py-1" /></td>)}
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-700">Decide by</th>
              {offers.map((a) => <td key={a.id} className="py-2 pr-3"><input type="date" value={details(a).decideBy || ""} onChange={(e) => set(a, { decideBy: e.target.value || undefined })} aria-label={`Decision deadline for ${a.company}`} className="rounded-md border border-slate-300 bg-surface px-2 py-1" /></td>)}
            </tr>
            {keys.map((k) => (
              <tr key={k}>
                <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-700">{RATING_LABELS[k]}</th>
                {offers.map((a) => {
                  const v = details(a).ratings?.[k];
                  return (
                    <td key={a.id} className="py-2 pr-3">
                      <span role="radiogroup" aria-label={`${RATING_LABELS[k]} at ${a.company}`} className="inline-flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} role="radio" aria-checked={v === n} aria-label={`${n} of 5`} onClick={() => set(a, { ratings: { ...details(a).ratings, [k]: n } })} className={`h-6 w-6 rounded text-xs ${v && n <= v ? "bg-emerald-600 text-white" : "bg-surface text-slate-500 ring-1 ring-slate-300"}`}>{n}</button>
                        ))}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2 pr-3 text-left font-semibold text-slate-900">Score</th>
              {offers.map((a, i) => <td key={a.id} className="py-2 pr-3 font-semibold tabular-nums text-slate-900">{scores[i]}/100{scores[i] === top && scores.filter((s) => s === top).length === 1 && <span className="ml-1.5 tag bg-emerald-100 text-emerald-800">leaning</span>}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Pay is read from the posting where it was listed; correct it to match your offer letter. A score is a way to think it through, not an answer. Write the accept or decline email from each offer&apos;s Next steps.</p>
    </section>
  );
}
