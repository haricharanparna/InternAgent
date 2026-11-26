"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { followUpDue, type TrackedApp } from "@/lib/tracker";
import { KEYS, useStored } from "@/lib/prefs";

type Item = { key: string; icon: string; text: string; when: string; urgent?: boolean; open?: string; search?: boolean };

const DAY = 86_400_000;
const fmt = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Built from your own applications in this browser: follow-ups, interviews,
// deadlines, assessments and new internships. Read state is saved locally.
export type WatchHit = { company: string; count: number; at: string };

export function notificationsFor(apps: TrackedApp[], newCount: { count: number; at: string } | null, now = Date.now(), watchNew: WatchHit[] = []): Item[] {
  const out: Item[] = [];
  for (const a of apps) {
    const who = `${a.title} at ${a.company}`;
    if (followUpDue(a, now)) {
      const days = Math.floor((now - new Date(a.appliedAt!).getTime()) / DAY);
      out.push({ key: `follow:${a.id}`, icon: "✉️", text: `Follow up on ${who}: ${days} days since you applied.`, when: "Due now", urgent: true, open: a.id });
    }
    if (a.interviewAt) {
      const t = new Date(a.interviewAt).getTime();
      if (t > now && t - now <= 7 * DAY) out.push({ key: `int:${a.id}:${a.interviewAt}`, icon: "🎤", text: `Interview for ${who}. Practice in Interview prep.`, when: fmt(new Date(t)), urgent: t - now <= DAY, open: a.id });
      if (t <= now && now - t <= 2 * DAY && a.status === "interview") out.push({ key: `thanks:${a.id}:${a.interviewAt}`, icon: "🙏", text: `Send a thank-you note for your ${a.company} interview.`, when: "Within 24 hours", urgent: true, open: a.id });
    }
    if (a.deadline && a.status === "saved") {
      const t = new Date(a.deadline + "T23:59").getTime();
      if (t > now && t - now <= 7 * DAY) out.push({ key: `dl:${a.id}:${a.deadline}`, icon: "⏰", text: `Apply to ${who} before the deadline.`, when: fmtDay(new Date(t)), urgent: t - now <= 2 * DAY, open: a.id });
      else if (t <= now && now - t <= 14 * DAY) out.push({ key: `dlpast:${a.id}:${a.deadline}`, icon: "⌛", text: `The deadline you noted for ${who} has passed. Apply anyway if it's still open, or archive it.`, when: fmtDay(new Date(t)), open: a.id });
    }
    if (a.status === "offer" && a.offer?.decideBy) {
      const t = new Date(a.offer.decideBy + "T23:59").getTime();
      if (t > now && t - now <= 7 * DAY) out.push({ key: `decide:${a.id}:${a.offer.decideBy}`, icon: "🤝", text: `Decide on your ${a.company} offer. Compare offers in Applications.`, when: fmtDay(new Date(t)), urgent: t - now <= 2 * DAY, open: a.id });
    }
    if (a.status === "assessment") out.push({ key: `asm:${a.id}`, icon: "🧩", text: `Finish the assessment for ${who}.`, when: "Before it's due", open: a.id });
  }
  for (const w of watchNew) out.push({ key: `watch:${w.company}:${w.at}`, icon: "★", text: `${w.company} posted ${w.count} new internship${w.count === 1 ? "" : "s"}. You're watching this company.`, when: fmtDay(new Date(w.at)), search: true });
  if (newCount && newCount.count > 0) out.push({ key: `new:${newCount.at}`, icon: "✨", text: `${newCount.count} new internship${newCount.count === 1 ? "" : "s"} since your last search.`, when: fmtDay(new Date(newCount.at)), search: true });
  return out.sort((x, y) => Number(!!y.urgent) - Number(!!x.urgent));
}

export default function Notifications({ apps, onOpen, onSearch }: { apps: TrackedApp[]; onOpen: (id: string) => void; onSearch: () => void }) {
  const [read, setRead] = useStored<string[]>(KEYS.read, []);
  const [newCount] = useStored<{ count: number; at: string } | null>(KEYS.newCount, null);
  const [watchNew] = useStored<WatchHit[]>(KEYS.watchNew, []);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const items = useMemo(() => notificationsFor(apps, newCount, Date.now(), watchNew), [apps, newCount, watchNew]);
  const unread = items.filter((i) => !read.includes(i.key));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, [open]);

  const markRead = (keys: string[]) => setRead((r) => [...new Set([...r, ...keys])].slice(-300));

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[1.1rem] text-white">{unread.length}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notifications" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread.length > 0 && <button onClick={() => markRead(items.map((i) => i.key))} className="text-xs text-blue-700 underline underline-offset-2">Mark all read</button>}
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">You&apos;re all caught up. Reminders for follow-ups, interviews and deadlines show up here.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((i) => {
                const isRead = read.includes(i.key);
                return (
                  <li key={i.key}>
                    <button
                      onClick={() => { markRead([i.key]); setOpen(false); if (i.open) onOpen(i.open); else if (i.search) onSearch(); }}
                      className={`flex w-full gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${isRead ? "opacity-60" : ""}`}
                    >
                      <span aria-hidden>{i.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block ${isRead ? "text-slate-600" : "font-medium text-slate-900"}`}>{i.text}</span>
                        <span className={`text-xs ${i.urgent && !isRead ? "font-semibold text-rose-700" : "text-slate-500"}`}>{i.when}</span>
                      </span>
                      {!isRead && <span aria-label="unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">Made from your applications in this browser. Add them to your calendar from Applications for phone reminders.</p>
        </div>
      )}
    </div>
  );
}
