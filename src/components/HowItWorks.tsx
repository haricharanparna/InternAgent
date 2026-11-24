"use client";

import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { fmt, useStats } from "@/lib/useStats";

const SAMPLE_SKILLS = ["Python", "JavaScript", "React", "SQL", "Git", "pandas"];
const SAMPLE_POSTING =
  "Software Engineering Intern, Summer 2027. You will build internal tools with React and TypeScript, write Python scripts to clean data, and query our SQL warehouse. Familiarity with Git is a plus.";

const STEPS = [
  { name: "Read resume", detail: "Gemini turns your PDF into a structured profile" },
  { name: "Collect jobs", detail: "Public job boards + SimplifyJobs, deduplicated" },
  { name: "Rank by keywords", detail: "Instant, free, runs in your browser" },
  { name: "Score with AI", detail: "12 postings per request, 0–100 with reasons" },
  { name: "Tailor resume", detail: "Rewords your bullets; server checks every skill" },
  { name: "Next steps & track", detail: "A plan, emails, a cover letter and interview practice for the job you chose, plus a status board" },
];

const API = [
  ["GET", "/api/jobs", "All current internships (CDN-cached for 1 hour)"],
  ["GET", "/api/stats", "Aggregate counts used on these pages"],
  ["GET", "/api/health", "Status check; doesn't use AI quota"],
  ["POST", "/api/parse-resume", "PDF (≤ 5 MB) → profile JSON"],
  ["POST", "/api/score", "Profile + up to 12 jobs → fit scores"],
  ["POST", "/api/tailor", "Profile + 1 job → reworded resume"],
  ["POST", "/api/explain", "1 job → plain-English role + company summary"],
  ["POST", "/api/next-steps", "Profile + 1 chosen job + stage → step-by-step plan"],
  ["POST", "/api/build-resume", "Your answers to the builder questions → summary, bullets, skill groups (facts copied by code)"],
  ["POST", "/api/interview", "mode questions: profile + job → 7 questions · mode feedback: question + answer → STAR feedback"],
  ["POST", "/api/improve-bullet", "One resume bullet → 3 rewrites (new numbers filtered out) + a question"],
  ["POST", "/api/email", "Profile + 1 chosen job + email or cover-letter type → subject, body, tips"],
  ["POST", "/api/chat", "Last 12 messages + profile → assistant reply"],
];

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-800">
      {children}
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-slate-200 pt-8 md:grid-cols-[3rem_1fr]">
      <span className="font-serif text-3xl text-slate-400">{String(n).padStart(2, "0")}</span>
      <div className="min-w-0 space-y-4">
        <h2 className="text-2xl font-medium text-slate-900">{title}</h2>
        {children}
      </div>
    </section>
  );
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">{children}</p>
);

// Same logic as keywordScore() in src/lib/jobs.ts, shown step by step.
function KeywordDemo({ profile }: { profile: Profile | null }) {
  const terms = profile ? [...profile.skills, ...profile.interests] : SAMPLE_SKILLS;
  const [text, setText] = useState(SAMPLE_POSTING);
  const rows = useMemo(() => {
    const lower = text.toLowerCase();
    return terms.filter(Boolean).map((t) => ({ term: t, hit: lower.includes(t.toLowerCase()) }));
  }, [text, terms]);
  const k = rows.filter((r) => r.hit).length;

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-900">Try it</p>
      <p className="text-xs text-slate-500">
        Using {profile ? "the skills and interests from your resume" : "a sample student's skills"}. Paste any job description.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="mt-3 w-full rounded-md border border-slate-300 bg-surface p-3 text-sm outline-none focus:border-blue-500"
        aria-label="Job description to score"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <span key={r.term} className={`tag ${r.hit ? "tag-accent" : "text-slate-400 line-through decoration-slate-300"}`}>
            {r.hit ? "1" : "0"} · {r.term}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-sm text-slate-800">
        k = {rows.map((r) => (r.hit ? 1 : 0)).join(" + ") || 0} = <b className="text-blue-600">{k}</b>
      </p>
    </div>
  );
}

export default function HowItWorks({ profile }: { profile: Profile | null }) {
  const { stats } = useStats();
  const [models, setModels] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((d) => setModels(d.models || [])).catch(() => {});
  }, []);
  const p = stats?.pipeline;
  const boardCount = p ? p.boards.greenhouse + p.boards.lever + p.boards.ashby : null;

  return (
    <div className="space-y-10">
      <section>
        <p className="kicker">How it works</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-medium leading-tight tracking-tight text-slate-900 sm:text-5xl">
          No black box. Here&apos;s the <em className="text-blue-600">math</em>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
          Every step from your resume to a tailored application, with the exact rules and formulas the backend uses. The
          numbers in blue are live from the current job list.
        </p>
      </section>

      <ol className="grid gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <li key={s.name} className="bg-surface p-4">
            <span className="text-xs font-semibold text-blue-600">Step {i + 1}</span>
            <p className="mt-1 font-serif text-lg leading-tight text-slate-900">{s.name}</p>
            <p className="mt-1 text-xs leading-snug text-slate-500">{s.detail}</p>
          </li>
        ))}
      </ol>

      <Section n={1} title="Reading your resume">
        <P>
          The PDF (up to 5 MB) goes to Gemini as a file, with a JSON schema that only allows these fields: name, email, school,
          major, graduation year, skills, experiences (title, organization, type, bullets) and interests. The prompt tells the
          model to copy facts, not infer them. The result is kept in your browser&apos;s storage, never in a database.
        </P>
        <P>
          <b>No resume? The builder.</b> You answer plain questions instead. Code copies your name, contact details, school and
          dates exactly; the AI only writes the summary, the bullets and the skill groups, and the server checks them:
        </P>
        <Formula>
          bullet kept ⇔ every number in it appears in your answers for that experience
          <br />
          skill kept ⇔ lowercase(skill) ∈ lowercase(skills you typed ∪ tools you typed); unplaced skills → &quot;Other&quot;
          <br />
          tense = present if the end date says &quot;Present&quot; or there&apos;s a start date and no end date, otherwise past
        </Formula>
        <P>
          The resume checks are plain code: bullets that start with weak phrases (&quot;Responsible for&quot;, &quot;Helped&quot;), bullets over
          28 words, the share of bullets with a number (aim for 30%+), leftover [placeholders], and about 550 words as the
          one-page limit.
        </P>
      </Section>

      <Section n={2} title="Collecting internships">
        <P>
          On each refresh the server calls{" "}
          <b className="text-blue-600">{boardCount ?? "…"}</b> company job boards (Greenhouse {p?.boards.greenhouse ?? "…"}, Lever{" "}
          {p?.boards.lever ?? "…"}, Ashby {p?.boards.ashby ?? "…"}) plus the SimplifyJobs list, all at the same time. A board that
          fails is skipped instead of breaking the search.
        </P>
        <Formula>
          keep a posting if&nbsp; title matches /\b(intern|internship|co-?op)\b/i
          <br />
          SimplifyJobs: active AND (term matches /{p?.termRule ?? "202[7-9]|Fall 2026|Winter 2026"}/ OR posted ≤ {p?.maxAgeDays ?? 150} days ago)
          <br />
          dedupe key = lowercase(company + &quot;|&quot; + title), letters and digits only
        </Formula>
        {p?.raw ? (
          <div className="grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-center">
            {[
              [fmt(p.raw), "postings found"],
              [`− ${fmt(p.duplicates ?? 0)}`, "duplicates removed"],
              [`= ${fmt(stats!.total)}`, "unique internships"],
            ].map(([v, l]) => (
              <div key={l} className="bg-surface p-3">
                <p className="font-serif text-2xl text-blue-600">{v}</p>
                <p className="text-xs text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        ) : null}
        <P>
          Company boards are loaded first, so when the same job appears on both, the version with the full description wins.
          The result is cached for {p?.cacheMinutes ?? 60} minutes on the server and at Vercel&apos;s CDN
          {p?.ms ? `; the last full refresh took ${(p.ms / 1000).toFixed(1)} s` : ""}.
        </P>
      </Section>

      <Section n={3} title="Ranking by keywords (free and instant)">
        <P>
          Sending thousands of postings to the AI would blow through the free tier, so your browser ranks them first. For every
          skill or interest <i>t</i> on your resume, a posting gets one point if <i>t</i> appears in its title or description:
        </P>
        <Formula>k(job) = Σ over t in (skills ∪ interests) of [ t appears in title + description ]&nbsp;&nbsp;→ sort by k, highest first</Formula>
        <KeywordDemo profile={profile} />
        <P>
          <b>Keyword match on each card.</b> Like the resume-match scores in other job tools, but free and shown openly. The posting is
          checked against a list of about 160 hard skills (with spellings like &quot;JS&quot; and &quot;Postgres&quot; folded together), and so is your
          resume&apos;s skills and bullets:
        </P>
        <Formula>
          keyword match = |skills the posting names ∩ skills your resume shows| ÷ |skills the posting names|
          <br />
          shown only when the posting names 3+ skills · green ≥ 70% · amber 40–69% · red &lt; 40%
        </Formula>
        <P>
          <b>Freshness.</b> Each card shows when the posting went up (Greenhouse first_published, Lever createdAt, Ashby publishedAt,
          SimplifyJobs date_posted). Your browser remembers which postings it showed you last time, so new ones get a
          &quot;New&quot; badge and their own filter.
        </P>
      </Section>

      <Section n={4} title="AI fit score (0–100)">
        <P>
          &quot;Score next 12 with AI&quot; sends your profile and the next 12 unscored postings in one request (each description
          trimmed to 1,800 characters). Temperature is 0.2, which keeps answers consistent, and the reply must match a strict
          JSON schema: <code>{"{ id, score: integer 0–100, matched[≤5], missing[≤5], reason }"}</code>.
        </P>
        <Formula>
          rubric given to the model: 80+ = strong application today · under 40 = long shot · &quot;be realistic, not flattering&quot;
          <br />
          labels on the card: score ≥ 75 → Strong fit · 50–74 → Possible fit · &lt; 50 → Long shot
        </Formula>
        <P>
          The model is told never to assume a skill that isn&apos;t in your profile. For SimplifyJobs listings, which only have a
          title and category, it&apos;s told to keep &quot;missing&quot; to what the title clearly implies.
        </P>
      </Section>

      <Section n={5} title="Tailoring without inventing anything">
        <P>The AI may only reword. Then the server checks its work before you see it:</P>
        <Formula>
          skills_shown = [ s in AI&apos;s order if lowercase(s) is in lowercase(your skills) ] + [ your remaining skills ]
          <br />
          original bullet = taken from your profile, not from the AI
          <br />
          any skill the AI adds that isn&apos;t on your resume → dropped
        </Formula>
        <P>
          Each change is shown side by side with your original and a note on why it changed, so you can catch anything you
          disagree with.
        </P>
      </Section>

      <Section n={6} title="Next steps and emails for the job you chose">
        <P>
          When you save a job, InternAgent writes a plan for that exact posting and stage. The server works out the dates
          itself, so the AI never has to guess them:
        </P>
        <Formula>
          days since applied = ⌊(today − applied_at) ÷ 86,400,000 ms⌋
          <br />
          follow-up date = applied_at + 7 days
          <br />
          stage goal: saved → apply well · applied → follow up · interview → prepare and thank · offer → decide · rejected → close the loop
        </Formula>
        <P>
          The plan and the 6 email types (reach out, follow up, thank you, referral, accept, decline) use only your resume, your
          notes and the posting. Anything unknown, like a recruiter&apos;s name, becomes a [bracketed] placeholder that the app
          highlights for you to fill in. A skill is never linked to a project unless that project&apos;s bullets mention it.
          Changing the stage rewrites the plan, and your checked-off steps are saved in your browser. If you add an application
          deadline or interview date, those are given to the AI as computed facts too (&quot;interview in 3 days&quot;).
        </P>
        <P>
          <b>Cover letter.</b> A seventh type: 230–330 words in four paragraphs, using only facts from your resume and the posting,
          downloadable as a PDF.
        </P>
        <P>
          <b>Interview prep.</b> Seven likely questions in a fixed mix (3 behavioral, 2 technical from the posting, 1 &quot;why this role&quot;,
          1 about a requirement you may lack), each with why it&apos;s asked and which of your experiences to use. You answer by
          typing or speaking (your browser&apos;s built-in speech recognition), and feedback marks each STAR part:
        </P>
        <Formula>
          spoken time ≈ words ÷ 140 words per minute (flagged above 2 minutes)
          <br />
          STAR = Situation ✓/✗ · Task ✓/✗ · Action ✓/✗ · Result ✓/✗ · score 1–5
          <br />
          tighter version uses only your answer + resume; missing results become [placeholders]
        </Formula>
      </Section>

      <Section n={7} title="Tracker math">
        <Formula>
          applied = applications with status ≠ saved
          <br />
          response rate = |interview ∪ offer ∪ rejected| ÷ |applied|
          <br />
          follow-up due ⇔ status = applied AND now − applied_at ≥ 7 × 86,400,000 ms (7 days)
        </Formula>
        <P>A rejection counts as a response, because hearing back at all is the signal the rate measures.</P>
      </Section>

      <Section n={8} title="Near me and remote">
        <P>
          Your browser asks for your location once. The coordinates are rounded to 2 decimal places (about 1 km) and sent to
          BigDataCloud&apos;s free lookup to get a city and state. Only those are saved.
        </P>
        <Formula>near(job) ⇔ location contains your city OR your state&apos;s name OR matches &quot;, XX&quot; (your state code)&nbsp;&nbsp;·&nbsp;&nbsp;remote roles are always included</Formula>
      </Section>

      <Section n={9} title="Reliability">
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li>
            <b>Model fallback:</b> {models.length ? models.join(" → ") : "three Gemini models"}. If one is overloaded (429, 500,
            503, 504), retired (404) or takes over 30 s, the next one is tried. Worst case ≈ {models.length || 3} × 30 s.
          </li>
          <li><b>Rate limit:</b> 20 AI requests per minute per visitor, so one person can&apos;t use up the shared free quota.</li>
          <li><b>Caching:</b> job data is cached for 1 hour at Vercel&apos;s CDN and refreshed in the background, so visitors almost never wait for the job boards.</li>
          <li><b>Partial failures:</b> if some job boards fail, the rest still load; an empty result is never cached.</li>
          <li><b>Health check:</b> <a className="text-blue-600 underline underline-offset-2" href="/api/health" target="_blank" rel="noreferrer">/api/health</a> reports whether the AI is configured and which models are in the chain, without using AI quota.</li>
        </ul>
      </Section>

      <Section n={10} title="API reference">
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-3 py-2">Method</th><th className="px-3 py-2">Endpoint</th><th className="px-3 py-2">What it does</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {API.map(([m, path, what]) => (
                <tr key={path}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{m}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-900">{path}</td>
                  <td className="px-3 py-2 text-slate-700">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
