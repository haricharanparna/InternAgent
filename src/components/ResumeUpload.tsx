"use client";

import { useRef, useState } from "react";
import { LogoMark } from "./Logo";
import type { Profile } from "@/lib/types";

type Props = {
  profile: Profile | null;
  onProfile: (p: Profile | null) => void;
};

const KIND_STYLE: Record<string, string> = {
  job: "bg-sky-50 text-sky-700",
  project: "bg-violet-50 text-violet-700",
  hackathon: "bg-fuchsia-50 text-fuchsia-700",
  club: "bg-amber-50 text-amber-700",
  volunteer: "bg-emerald-50 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

export default function ResumeUpload({ profile, onProfile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setError("");
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setLoading(true);
    try {
      const body = new FormData();
      body.append("resume", file);
      const res = await fetch("/api/parse-resume", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read resume.");
      onProfile(data.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function useSample() {
    const blob = await fetch("/sample-resume.pdf").then((r) => r.blob());
    upload(new File([blob], "sample-resume.pdf", { type: "application/pdf" }));
  }

  if (profile) {
    return (
      <section className="card animate-fade-up overflow-hidden">
        <div className="h-14 border-b border-slate-200 bg-slate-100" />
        <div className="px-6 pb-6">
          {/* Only the avatar overlaps the banner; the text always sits below it. */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-4">
              <div className="-mt-8 shrink-0 rounded-lg bg-surface ring-4 ring-surface">
                <LogoMark size={64} />
              </div>
              <div className="min-w-0 pt-3">
                <h2 className="text-2xl font-medium text-slate-900">{profile.name || "Your profile"}</h2>
                <p className="text-sm text-slate-500">
                  {[profile.major, profile.school, profile.graduationYear && `Class of ${profile.graduationYear}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <button onClick={() => onProfile(null)} className="btn-secondary mt-3">↺ New resume</button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 [&>*]:min-w-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Skills · {profile.skills.length}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="chip bg-blue-50 text-blue-700">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experience · {profile.experiences.length}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {profile.experiences.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-slate-800">{e.title}</span>
                      {e.organization && <span className="text-slate-500"> · {e.organization}</span>}
                    </span>
                    <span className={`chip shrink-0 ${KIND_STYLE[e.kind] || KIND_STYLE.other}`}>{e.kind}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) upload(f);
      }}
      style={{ animationDelay: "400ms" }}
      className={`card animate-fade-up mx-auto max-w-2xl border-2 border-dashed p-10 text-center transition ${
        dragging ? "border-blue-400 bg-blue-50/80" : "border-slate-200"
      }`}
    >
      <div className="animate-float mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-blue-50">
        {loading ? (
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-600" />
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
          </svg>
        )}
      </div>
      <p className="mt-4 font-serif text-2xl text-slate-900">
        {loading ? "Reading your resume…" : "Drop your resume here"}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {loading ? "The AI is building your profile. This takes a few seconds." : "PDF, up to 5 MB. Your file is never stored on a server."}
      </p>
      {!loading && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => input.current?.click()} className="btn-primary">Choose PDF</button>
          <button onClick={useSample} className="btn-secondary">Try with a sample resume</button>
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
