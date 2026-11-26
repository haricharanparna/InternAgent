"use client";

import { useState } from "react";
import type { ScoredJob } from "@/lib/types";
import { trustOf } from "@/lib/authenticity";

// Save an internship found anywhere (LinkedIn, Handshake, a career fair, a
// company site) so it gets the same plan, emails and interview prep.

export default function AddJobForm({ onAdd, onCancel }: { onAdd: (job: ScoredJob) => void; onCancel: () => void }) {
  const [f, setF] = useState({ title: "", company: "", location: "", url: "", description: "" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.title.trim() || !f.company.trim()) { setError("Add at least the role and the company."); return; }
    let url = f.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { if (url) new URL(url); } catch { setError("That link doesn't look like a web address."); return; }
    onAdd({
      id: `custom-${Date.now().toString(36)}`,
      title: f.title.trim().slice(0, 140),
      company: f.company.trim().slice(0, 80),
      location: f.location.trim().slice(0, 80) || "Not listed",
      url: url || `https://www.google.com/search?q=${encodeURIComponent(`${f.company} ${f.title}`)}`,
      source: "greenhouse",
      custom: true,
      description: f.description.trim().slice(0, 6000),
    });
  }

  return (
    <form onSubmit={submit} className="card animate-fade-in space-y-3 p-4">
      <div>
        <h2 className="font-semibold text-slate-900">Add an internship from anywhere</h2>
        <p className="text-sm text-slate-600">Found it on LinkedIn, Handshake, a company site or at a career fair? Save it here to get next steps, emails, a cover letter and interview prep for it.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="field-label">Role *</span><input className="field" value={f.title} onChange={set("title")} placeholder="Marketing Intern" /></label>
        <label className="block"><span className="field-label">Company *</span><input className="field" value={f.company} onChange={set("company")} placeholder="Spotify" /></label>
        <label className="block"><span className="field-label">Location</span><input className="field" value={f.location} onChange={set("location")} placeholder="New York, NY or Remote" /></label>
        <label className="block"><span className="field-label">Link to the posting</span><input className="field" value={f.url} onChange={set("url")} placeholder="https://…" inputMode="url" /></label>
      </div>
      <label className="block">
        <span className="field-label">Paste the job description <span className="font-normal text-slate-400">(recommended: the AI uses it for steps, cover letters and interview questions)</span></span>
        <textarea className="field min-h-28" value={f.description} onChange={set("description")} placeholder="Responsibilities, requirements, about the team…" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {(() => {
        // Scam check on what they pasted, before they save it. Plain text rules, no AI.
        const t = f.company && (f.url || f.description.length > 40)
          ? trustOf({ id: "draft", title: f.title, company: f.company, location: f.location, url: f.url.trim(), source: "greenhouse", custom: true, description: f.description })
          : null;
        return t && t.flags.length ? (
          <div role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="font-semibold">This listing has signs of a common internship scam</p>
            <ul className="mt-1 list-disc pl-5">{t.flags.map((x) => <li key={x.label}>{x.label}</li>)}</ul>
            <p className="mt-1 text-xs">You can still save it, but check the role on {f.company}&apos;s own careers page first.</p>
          </div>
        ) : null;
      })()}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary">Save & get next steps</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
