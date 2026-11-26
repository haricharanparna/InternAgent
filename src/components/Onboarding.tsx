"use client";

import { useEffect, useState } from "react";
import { KEYS, useStored } from "@/lib/prefs";

type Tab = "search" | "build" | "skills" | "tracker" | "impact" | "how";

const STEPS: { title: string; text: string; tab?: Tab; action?: string }[] = [
  { title: "Find internships", text: "Press Find internships below, or type what you want in plain English, like \"remote data internships summer 2027\"." },
  { title: "Open one", text: "Tap any internship for its key facts, a trust check, whether to apply first, and a step-by-step plan." },
  { title: "Apply with your own resume", text: "Tailor your resume and write a cover letter. The AI only rewords what's already true about you." },
  { title: "Track it", text: "Saved internships go to Applications, with reminders, emails and interview practice.", tab: "tracker", action: "Open Applications" },
  { title: "Close the gaps", text: "Skill gaps shows which skills would open up the most internships, with free ways to learn them.", tab: "skills", action: "Open Skill gaps" },
];

// A short first-visit guide. Dismissed once, remembered in this browser.
export default function Onboarding({ onTab }: { onTab: (t: Tab) => void }) {
  const [done, setDone] = useStored<boolean>(KEYS.onboarded, false);
  const [i, setI] = useState(0);
  // Wait until the saved "done" flag has loaded, so returning students never see it flash.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (done || !mounted) return null;
  const step = STEPS[i];
  return (
    <section aria-label="Getting started" className="animate-fade-up rounded-md border border-blue-200 bg-blue-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Getting started · {i + 1} of {STEPS.length}</p>
        <button onClick={() => setDone(true)} className="text-xs text-slate-500 underline underline-offset-2">Skip</button>
      </div>
      <h2 className="mt-1 font-semibold text-slate-900">{step.title}</h2>
      <p className="mt-0.5 text-sm text-slate-700">{step.text}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {i > 0 && <button onClick={() => setI(i - 1)} className="btn-secondary px-3 py-1.5">Back</button>}
        {i < STEPS.length - 1
          ? <button onClick={() => setI(i + 1)} className="btn-primary px-3 py-1.5">Next</button>
          : <button onClick={() => setDone(true)} className="btn-primary px-3 py-1.5">Got it</button>}
        {step.tab && <button onClick={() => onTab(step.tab!)} className="text-sm font-medium text-blue-700 underline underline-offset-2">{step.action}</button>}
        <span className="ml-auto flex gap-1" aria-hidden>
          {STEPS.map((_, n) => <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-blue-600" : "bg-blue-200"}`} />)}
        </span>
      </div>
    </section>
  );
}
