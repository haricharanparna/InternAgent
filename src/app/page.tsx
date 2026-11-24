"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Tracker from "@/components/Tracker";
import ThemeToggle from "@/components/ThemeToggle";
import SettingsPanel from "@/components/SettingsPanel";
import ChatWidget from "@/components/ChatWidget";
import Impact from "@/components/Impact";
import HowItWorks from "@/components/HowItWorks";
import OpportunityPanel from "@/components/OpportunityPanel";
import ResumeBuilder from "@/components/ResumeBuilder";
import { followUpDue, useTracker } from "@/lib/tracker";
import type { Profile } from "@/lib/types";

const PROFILE_KEY = "internagent.profile";

type Tab = "search" | "build" | "tracker" | "impact" | "how";

const STATS = [
  { value: "4,600+", label: "live internships from official job boards" },
  { value: "1,300+", label: "companies, refreshed every hour" },
  { value: "0", label: "facts invented on your resume" },
  { value: "$0", label: "cost to use, no account needed" },
];

const STEPS = [
  "Upload your resume as a PDF, or build one by answering a few questions. Nothing is stored on a server.",
  "Browse internships ranked by your skills, filtered by where you live or remote.",
  "Get an honest fit score that shows which requirements you meet and which you don't.",
  "Tailor your resume for one posting. Every bullet is reworded from your own words, never invented.",
  "Track every application on one board, with reminders to follow up after a week.",
];

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("search");
  // The opportunity whose next-steps panel is open (opens when you save a job).
  const [openId, setOpenId] = useState<string | null>(null);
  const tracker = useTracker();
  const openApp = tracker.apps.find((a) => a.id === openId);
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
    `relative -mb-px shrink-0 border-b-2 px-1 py-2 text-sm transition sm:text-[15px] ${
      tab === t ? "border-blue-600 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-[var(--page-bg)]">
        {/* On phones the tabs drop to their own row under the logo. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-4 pt-2 sm:py-2">
          <button onClick={() => setTab("search")} aria-label="InternAgent home" className="group">
            <Logo />
          </button>
          <nav className="order-3 -mx-4 flex basis-full gap-4 overflow-x-auto whitespace-nowrap px-4 [scrollbar-width:none] sm:gap-5 sm:order-2 sm:mx-0 sm:ml-auto sm:basis-auto sm:px-0">
            <button className={tabClass("search")} onClick={() => setTab("search")}>Search</button>
            <button className={tabClass("build")} onClick={() => setTab("build")}>Build a resume</button>
            <button className={tabClass("tracker")} onClick={() => setTab("tracker")}>
              Applications
              <span className="ml-1.5 rounded-[3px] border border-slate-300 px-1.5 text-[11px] text-slate-600">{tracker.apps.length}</span>
              {dueCount > 0 && <span className="absolute -right-2 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface" title="Follow-ups due" />}
            </button>
            <button className={tabClass("impact")} onClick={() => setTab("impact")}>Impact</button>
            <button className={tabClass("how")} onClick={() => setTab("how")}>How it works</button>
          </nav>
          <div className="order-2 ml-auto flex items-center gap-1.5 sm:order-3 sm:ml-0">
            <ThemeToggle />
            <SettingsPanel />
          </div>
        </div>
      </header>

      <main className={`mx-auto space-y-10 px-4 py-10 ${tab === "tracker" || tab === "build" ? "max-w-6xl" : tab === "search" ? "max-w-4xl" : "max-w-5xl"}`}>
        {/* Kept mounted while hidden so search results survive tab switches. */}
        <div className={tab === "search" ? "space-y-10" : "hidden"}>
          {!profile && (
            <section className="pt-2">
              <p className="kicker animate-fade-up">AI internship agent for students</p>
              <h1 style={{ animationDelay: "60ms" }} className="animate-fade-up mt-3 max-w-3xl text-[2.6rem] font-medium leading-[1.08] tracking-tight text-slate-900 sm:text-6xl">
                Find internships you <em className="text-blue-600">actually</em> fit. Apply with a resume that&apos;s <em className="text-blue-600">still yours</em>.
              </h1>
              <div className="mt-8 grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-start">
                <p style={{ animationDelay: "120ms" }} className="animate-fade-up max-w-md text-lg leading-relaxed text-slate-600 md:pt-4">
                  InternAgent searches live postings from top companies, scores how well you fit, and tailors your
                  resume for each one, without making anything up.
                </p>
                <dl style={{ animationDelay: "180ms" }} className="animate-fade-up grid grid-cols-2 border-t border-slate-200">
                  {STATS.map((st, i) => (
                    <div key={st.label} className={`border-b border-slate-200 py-4 ${i % 2 ? "border-l pl-5" : "pr-5"}`}>
                      <dt className="font-serif text-4xl text-slate-900">{st.value}</dt>
                      <dd className="mt-1 text-sm leading-snug text-slate-500">{st.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          <ResumeUpload profile={profile} onProfile={updateProfile} />
          {!profile && (
            <p className="-mt-6 text-sm text-slate-600">
              No resume yet?{" "}
              <button onClick={() => setTab("build")} className="font-medium text-blue-700 underline underline-offset-2">Build one by answering a few questions</button>
              , then edit it and download a PDF.
            </p>
          )}
          {profile && <JobList profile={profile} trackedIds={trackedIds} onTrack={(j) => { tracker.add(j); setOpenId(j.id); }} onOpen={setOpenId} />}

          {!profile && (
            <section>
              <h2 className="section-title">How it works</h2>
              <ol className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="mt-6 rounded-md bg-blue-50 px-4 py-3 text-sm text-slate-700">
                Curious how scores stay honest? The AI only rewords what&apos;s already on your resume, and any skill it
                can&apos;t find there is dropped before you see it.{" "}
                <button onClick={() => setTab("how")} className="font-medium text-blue-700 underline underline-offset-2">See the math</button>
              </p>
            </section>
          )}
        </div>

        {tab === "build" && <ResumeBuilder profile={profile} onUseProfile={(p) => { updateProfile(p); setTab("search"); window.scrollTo({ top: 0 }); }} />}
        {tab === "impact" && <Impact apps={tracker.apps} onSearch={() => setTab("search")} />}
        {tab === "how" && <HowItWorks profile={profile} />}

        {tab === "tracker" && (
          <Tracker apps={tracker.apps} onUpdate={tracker.update} onRemove={tracker.remove} onBrowse={() => setTab("search")} onOpen={setOpenId} />
        )}

        <footer className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          AI scores are estimates and can be wrong. Always read the full posting before applying.
        </footer>
      </main>
      {openApp && <OpportunityPanel app={openApp} profile={profile} onUpdate={tracker.update} onClose={() => setOpenId(null)} />}
      <ChatWidget />
    </>
  );
}
