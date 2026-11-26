"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";

// Profile completion: what the matching, priority and eligibility checks can
// use, what's missing, and a way to fix what the resume reader got wrong.
export function completion(p: Profile) {
  const bullets = p.experiences.flatMap((e) => e.bullets);
  const checks = [
    { label: "Name", done: !!p.name?.trim(), why: "used in emails and cover letters" },
    { label: "Email", done: !!p.email?.trim(), why: "used in cover letter signatures" },
    { label: "School", done: !!p.school?.trim(), why: "used in emails and fit scoring" },
    { label: "Major", done: !!p.major?.trim(), why: "used in fit scoring and your summary" },
    { label: "Graduation year", done: /20\d\d/.test(p.graduationYear || ""), why: "needed to check graduation windows" },
    { label: "5+ skills", done: p.skills.length >= 5, why: "keyword match compares postings with these" },
    { label: "2+ experiences", done: p.experiences.length >= 2, why: "projects, jobs and clubs all count" },
    { label: "Bullets with results", done: bullets.some((b) => /\d/.test(b)), why: "numbers you really have make bullets stronger" },
    { label: "Interests", done: p.interests.length > 0, why: "helps rank which fields to show first" },
  ];
  return { pct: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), checks };
}

const list = (s: string) => [...new Set(s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))];

export default function ProfileEditor({ profile, onProfile }: { profile: Profile; onProfile: (p: Profile) => void }) {
  const c = completion(profile);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: "", email: "", school: "", major: "", graduationYear: "", skills: "", interests: "" });
  const start = () => {
    setF({ name: profile.name, email: profile.email, school: profile.school, major: profile.major, graduationYear: profile.graduationYear, skills: profile.skills.join(", "), interests: profile.interests.join(", ") });
    setEditing(true);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onProfile({ ...profile, name: f.name.trim(), email: f.email.trim(), school: f.school.trim(), major: f.major.trim(), graduationYear: f.graduationYear.trim(), skills: list(f.skills), interests: list(f.interests) });
    setEditing(false);
  };
  const todo = c.checks.filter((x) => !x.done);

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-900">Profile {c.pct}% complete</span>
        <span className="h-1.5 min-w-[6rem] flex-1 overflow-hidden rounded-full bg-slate-200"><span className={`block h-full rounded-full ${c.pct >= 80 ? "bg-emerald-500" : c.pct >= 50 ? "bg-amber-500" : "bg-rose-400"}`} style={{ width: `${c.pct}%` }} /></span>
        {!editing && <button onClick={start} className="btn-secondary px-3 py-1.5">✎ Edit profile</button>}
      </div>
      {todo.length > 0 && !editing && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {todo.map((t) => <li key={t.label}>○ <b className="font-medium">{t.label}</b>: {t.why}</li>)}
        </ul>
      )}
      {editing && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
          {([["name", "Name"], ["email", "Email"], ["school", "School"], ["major", "Major"], ["graduationYear", "Graduation year"]] as const).map(([k, label]) => (
            <label key={k} className="block">
              <span className="field-label">{label}</span>
              <input className="field" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} inputMode={k === "graduationYear" ? "numeric" : undefined} />
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="field-label">Skills <span className="font-normal text-slate-400">(comma-separated; only skills you can really use)</span></span>
            <textarea className="field min-h-16" value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Interests <span className="font-normal text-slate-400">(fields or kinds of work, comma-separated)</span></span>
            <input className="field" value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} />
          </label>
          <p className="text-xs text-slate-500 sm:col-span-2">To change experiences and bullets, use Build a resume (it can start from this resume) or upload a new one.</p>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary">Save profile</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
