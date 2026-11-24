"use client";

import { useState } from "react";
import { FOLLOW_UP_DAYS, STATUSES, followUpDue, type Status, type TrackedApp } from "@/lib/tracker";
import { buildIcs, download, eventsFor, toCsv } from "@/lib/calendar";

type Props = {
  apps: TrackedApp[];
  onUpdate: (id: string, patch: Partial<TrackedApp>) => void;
  onRemove: (id: string) => void;
  onBrowse: () => void;
  onOpen: (id: string) => void;
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

export default function Tracker({ apps, onUpdate, onRemove, onBrowse, onOpen }: Props) {
  const [dragOver, setDragOver] = useState<Status | null>(null);

  if (apps.length === 0) {
    return (
      <section className="card p-12 text-center"><div className="text-4xl">📋</div>
        <p className="mt-3 font-serif text-2xl">No applications yet</p>
        <p className="mt-1 text-sm text-slate-600">Save internships from your search to track them here.</p>
        <button onClick={onBrowse} className="btn-primary mt-6">
          Find internships
        </button>
      </section>
    );
  }

  const sent = apps.filter((a) => a.status !== "saved");
  const heardBack = sent.filter((a) => ["interview", "offer", "rejected"].includes(a.status));
  const due = apps.filter((a) => followUpDue(a));
  const stats = [
    { label: "Tracked", value: apps.length },
    { label: "Applied", value: sent.length },
    { label: "Interviews", value: apps.filter((a) => a.status === "interview" || a.status === "offer").length },
    { label: "Response rate", value: sent.length ? `${Math.round((heardBack.length / sent.length) * 100)}%` : "—" },
  ];

  const events = apps.flatMap(eventsFor);
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

      {due.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Time to follow up on {due.length} application{due.length > 1 ? "s" : ""}.</b> No reply after{" "}
          {FOLLOW_UP_DAYS} days. A short, polite email to the recruiter can help: {due.map((a) => a.company).join(", ")}.
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        {STATUSES.map((col) => {
          const items = apps.filter((a) => a.status === col.id);
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

      <div className="mt-2 flex items-center gap-2">
        <select
          value={app.status}
          onChange={(e) => onUpdate(app.id, { status: e.target.value as Status })}
          aria-label="Status"
          className="min-w-0 flex-1 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200"
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
            <input type="datetime-local" value={app.interviewAt || ""} onChange={(e) => onUpdate(app.id, { interviewAt: e.target.value || undefined, ...(e.target.value && app.status !== "offer" && app.status !== "rejected" ? { status: "interview" as Status } : {}) })} className="mt-0.5 w-full rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-200" />
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
