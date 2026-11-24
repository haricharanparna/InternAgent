import { FOLLOW_UP_DAYS, STATUSES, type TrackedApp } from "./tracker";

// Builds a standard .ics calendar file and a CSV export of the tracker,
// both made in the browser so nothing leaves the student's device.

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const icsDay = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

type CalEvent = { uid: string; title: string; start: Date; allDay: boolean; minutes?: number; description: string; url: string };

export function eventsFor(a: TrackedApp): CalEvent[] {
  const out: CalEvent[] = [];
  const role = `${a.title} at ${a.company}`;
  if (a.deadline) out.push({ uid: `${a.id}-deadline`, title: `Apply: ${role}`, start: new Date(a.deadline + "T09:00"), allDay: true, description: "Application deadline you set in InternAgent.", url: a.url });
  if (a.interviewAt) out.push({ uid: `${a.id}-interview`, title: `Interview: ${role}`, start: new Date(a.interviewAt), allDay: false, minutes: 45, description: "Practice in InternAgent: open the job, then Interview prep. Send a thank-you within 24 hours.", url: a.url });
  if (a.status === "applied" && a.appliedAt) {
    const d = new Date(new Date(a.appliedAt).getTime() + FOLLOW_UP_DAYS * 86_400_000);
    out.push({ uid: `${a.id}-followup`, title: `Follow up: ${role}`, start: d, allDay: true, description: `${FOLLOW_UP_DAYS} days since you applied. InternAgent can draft the follow-up email.`, url: a.url });
  }
  return out;
}

export function buildIcs(events: CalEvent[]) {
  const now = icsDate(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//InternAgent//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@internagent`, `DTSTAMP:${now}`);
    if (e.allDay) {
      const next = new Date(e.start.getTime() + 86_400_000);
      lines.push(`DTSTART;VALUE=DATE:${icsDay(e.start)}`, `DTEND;VALUE=DATE:${icsDay(next)}`);
    } else {
      lines.push(`DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(new Date(e.start.getTime() + (e.minutes || 60) * 60_000))}`);
      lines.push("BEGIN:VALARM", "TRIGGER:-PT60M", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, "END:VALARM");
    }
    lines.push(`SUMMARY:${icsText(e.title)}`, `DESCRIPTION:${icsText(`${e.description}\n${e.url}`)}`, `URL:${e.url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function toCsv(apps: TrackedApp[]) {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Company", "Role", "Location", "Status", "Fit score", "Saved", "Applied", "Deadline", "Interview", "Next steps done", "Notes", "Link"];
  const rows = apps.map((a) => [
    a.company, a.title, a.location, STATUSES.find((s) => s.id === a.status)?.label, a.fitScore ?? "",
    a.savedAt?.slice(0, 10), a.appliedAt?.slice(0, 10) ?? "", a.deadline ?? "", a.interviewAt?.replace("T", " ") ?? "",
    a.plan ? `${(a.plan.done || []).length}/${a.plan.steps.length}` : "", a.notes, a.url,
  ]);
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
