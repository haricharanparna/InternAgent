"use client";

import { useState } from "react";
import type { TrackedApp } from "@/lib/tracker";
import type { Contact } from "@/lib/types";

// People connected to one application (recruiter, interviewer, a friend who
// works there), so follow-ups and thank-you notes go to the right person.

const blank = (): Contact => ({ id: Math.random().toString(36).slice(2, 9), name: "", role: "", email: "", link: "", note: "" });

export default function Contacts({ app, onUpdate, onEmail }: {
  app: TrackedApp;
  onUpdate: (id: string, patch: Partial<TrackedApp>) => void;
  onEmail: (c: Contact) => void;
}) {
  const contacts = app.contacts || [];
  const [draft, setDraft] = useState<Contact | null>(contacts.length ? null : blank());
  const save = (list: Contact[]) => onUpdate(app.id, { contacts: list });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft?.name.trim()) return;
    const exists = contacts.some((c) => c.id === draft.id);
    save(exists ? contacts.map((c) => (c.id === draft.id ? draft : c)) : [...contacts, draft]);
    setDraft(null);
  }

  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement>) => draft && setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Keep track of the people at {app.company}: the recruiter, your interviewers, or someone you know there. Most internships are
        won through a person, and a thank-you note needs a name.
      </p>

      {contacts.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
          {contacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{c.name}{c.role && <span className="font-normal text-slate-500"> · {c.role}</span>}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-slate-600">
                  {c.email && <a href={`mailto:${c.email}`} className="underline underline-offset-2">{c.email}</a>}
                  {c.link && <a href={/^https?:/.test(c.link) ? c.link : `https://${c.link}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">Profile ↗</a>}
                </p>
                {c.note && <p className="mt-0.5 text-slate-500">{c.note}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{c.lastContacted ? `Last contacted ${new Date(c.lastContacted).toLocaleDateString()}` : "Not contacted yet"}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => onEmail(c)} className="btn-primary px-3 py-1.5 text-xs">✉ Write to {c.name.split(" ")[0]}</button>
                <button onClick={() => save(contacts.map((x) => (x.id === c.id ? { ...x, lastContacted: new Date().toISOString() } : x)))} className="btn-secondary px-3 py-1.5 text-xs">Mark contacted today</button>
                <button onClick={() => setDraft(c)} className="btn-secondary px-3 py-1.5 text-xs">Edit</button>
                <button onClick={() => save(contacts.filter((x) => x.id !== c.id))} className="rounded px-2 text-xs text-rose-700 hover:bg-rose-50" aria-label={`Remove ${c.name}`}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <form onSubmit={submit} className="space-y-3 rounded-md border border-slate-200 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="field-label">Name *</span><input className="field" value={draft.name} onChange={set("name")} placeholder="Priya Shah" required /></label>
            <label className="block"><span className="field-label">Role</span><input className="field" value={draft.role} onChange={set("role")} placeholder="University recruiter" /></label>
            <label className="block"><span className="field-label">Email</span><input className="field" type="email" value={draft.email} onChange={set("email")} placeholder="priya@company.com" /></label>
            <label className="block"><span className="field-label">LinkedIn or profile link</span><input className="field" value={draft.link} onChange={set("link")} placeholder="linkedin.com/in/…" /></label>
          </div>
          <label className="block"><span className="field-label">How you know them</span><input className="field" value={draft.note} onChange={set("note")} placeholder="Met at the fall career fair; talked about their data team" /></label>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary px-4 py-2">Save contact</button>
            {contacts.length > 0 && <button type="button" onClick={() => setDraft(null)} className="btn-secondary">Cancel</button>}
          </div>
        </form>
      ) : (
        <button onClick={() => setDraft(blank())} className="btn-secondary">＋ Add a person</button>
      )}
    </div>
  );
}
