"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Tracker from "@/components/Tracker";
import ThemeToggle from "@/components/ThemeToggle";
import SettingsPanel from "@/components/SettingsPanel";
import ChatWidget from "@/components/ChatWidget";
import { followUpDue, useTracker } from "@/lib/tracker";
import type { Profile } from "@/lib/types";

const PROFILE_KEY = "internagent.profile";

type Tab = "search" | "tracker";

const FEATURES = [
  { icon: "🎯", title: "Honest fit scores", text: "See exactly which requirements you meet and which you don't." },
  { icon: "✍️", title: "Tailored resumes", text: "Rewritten for each posting, without inventing a single fact." },
  { icon: "📋", title: "Application tracker", text: "Every application in one board, with follow-up reminders." },
];

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("search");
  const tracker = useTracker();
  const trackedIds = useMemo(() => new Set(tracker.apps.map((a) => a.id)), [tracker.apps]);
  const dueCount = tracker.apps.filter((a) => followUpDue(a)).length;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) setProfile(JSON.parse(saved));
    } catch {}
  }, []);

  function updateProfile(p: Profile | null) {
    setProfile(p);
    try {
      if (p) localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      else localStorage.removeItem(PROFILE_KEY);
    } catch {}
  }

  const tabClass = (t: Tab) =>
    `relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
      tab === t ? "bg-surface text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <button onClick={() => setTab("search")} aria-label="InternAgent home" className="group">
            <Logo />
          </button>
          <div className="flex items-center gap-2">
          <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">
            <button className={tabClass("search")} onClick={() => setTab("search")}>Search</button>
            <button className={tabClass("tracker")} onClick={() => setTab("tracker")}>
              Applications
              <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600">{tracker.apps.length}</span>
              {dueCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-surface" title="Follow-ups due" />}
            </button>
          </nav>
          <ThemeToggle />
          <SettingsPanel />
          </div>
        </div>
      </header>

      <main className={`mx-auto space-y-8 px-4 py-10 ${tab === "tracker" ? "max-w-6xl" : "max-w-4xl"}`}>
        {/* Kept mounted while hidden so search results survive tab switches. */}
        <div className={tab === "search" ? "space-y-8" : "hidden"}>
          {!profile && (
            <section className="pt-4 text-center">
              <span className="chip animate-fade-up bg-blue-50 text-blue-700 ring-1 ring-blue-100">✨ AI internship agent for students</span>
              <h1 style={{ animationDelay: "80ms" }} className="animate-fade-up mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Land the internship you{" "}
                <span className="animate-gradient bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">actually fit</span>
              </h1>
              <p style={{ animationDelay: "160ms" }} className="animate-fade-up mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                Upload your resume. InternAgent searches live postings from top companies, scores your fit honestly, and
                tailors your resume, without making anything up.
              </p>
              <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {FEATURES.map((f, i) => (
                  <div key={f.title} style={{ animationDelay: `${240 + i * 90}ms` }} className="card animate-fade-up p-4 hover:-translate-y-1 hover:shadow-lg">
                    <div className="text-2xl">{f.icon}</div>
                    <p className="mt-2 font-semibold text-slate-900">{f.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{f.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ResumeUpload profile={profile} onProfile={updateProfile} />
          {profile && <JobList profile={profile} trackedIds={trackedIds} onTrack={tracker.add} />}
        </div>

        {tab === "tracker" && (
          <Tracker apps={tracker.apps} onUpdate={tracker.update} onRemove={tracker.remove} onBrowse={() => setTab("search")} />
        )}

        <footer className="border-t border-slate-200/70 pt-6 text-center text-xs text-slate-400">
          AI scores are estimates and can be wrong. Always read the full posting before applying. · Built for SLAY HACKS 2026
        </footer>
      </main>
      <ChatWidget />
    </>
  );
}
