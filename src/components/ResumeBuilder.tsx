"use client";

import { useEffect, useMemo, useState } from "react";
import type { BuilderAnswers, BuilderExperience, BuiltResume, ExperienceKind, Profile } from "@/lib/types";
import { builtResumeText, printBuiltResume } from "@/lib/resumePdf";
import { bumpUsage } from "@/lib/usage";

// Resume builder: asks a few plain questions, has the AI turn the answers
// into a resume, then lets the student edit every line before downloading.

const STORE = "internagent.builder";

const KINDS: { id: ExperienceKind; label: string }[] = [
  { id: "job", label: "Job or internship" },
  { id: "project", label: "Project" },
  { id: "hackathon", label: "Hackathon" },
  { id: "club", label: "Club or team" },
  { id: "volunteer", label: "Volunteering" },
  { id: "other", label: "Other" },
];

const STEPS = ["About you", "Education", "Experience", "Skills", "Your goal"] as const;

const uid = () => Math.random().toString(36).slice(2, 9);
const newExp = (): BuilderExperience => ({ id: uid(), kind: "project", role: "", org: "", location: "", start: "", end: "", what: "", tools: "", results: "" });
const EMPTY: BuilderAnswers = {
  name: "", email: "", phone: "", location: "", links: "",
  school: "", degree: "", major: "", gradDate: "", gpa: "", coursework: "", honors: "",
  experiences: [newExp()], skills: "", languages: "", target: "",
};

// Prefill the questions from a resume the student already uploaded.
function fromProfile(p: Profile): BuilderAnswers {
  return {
    ...EMPTY,
    name: p.name, email: p.email, school: p.school, major: p.major, gradDate: p.graduationYear,
    skills: p.skills.join(", "), target: p.interests.join(", "),
    experiences: p.experiences.length
      ? p.experiences.map((e) => ({ ...newExp(), kind: e.kind, role: e.title, org: e.organization, what: e.bullets.join(" ") }))
      : [newExp()],
  };
}

// The built resume as a profile, so it can drive the job search.
function toProfile(r: BuiltResume, a: BuilderAnswers): Profile {
  return {
    name: r.name,
    email: a.email.trim(),
    school: r.education[0]?.school || "",
    major: a.major.trim(),
    graduationYear: a.gradDate.match(/\d{4}/)?.[0] || "",
    skills: r.skills.filter((g) => g.label !== "Languages spoken").flatMap((g) => g.items),
    experiences: r.experiences.map((e) => ({ title: e.title, organization: e.organization, kind: e.kind, bullets: e.bullets.filter(Boolean) })),
    interests: a.target.split(/[,;]+/).map((s) => s.trim()).filter(Boolean),
  };
}

// ---------- Free checks that run in the browser (no AI) ----------
const WEAK_START = /^(responsible for|helped|worked on|worked with|assisted|did|was|i |my |participated in|tasked with)/i;
type Check = { ok: boolean; text: string };
function runChecks(r: BuiltResume): { checks: Check[]; words: number } {
  const bullets = r.experiences.flatMap((e) => e.bullets.filter(Boolean));
  const weak = bullets.filter((b) => WEAK_START.test(b.trim()));
  const long = bullets.filter((b) => b.split(/\s+/).length > 28);
  const withNum = bullets.filter((b) => /\d/.test(b));
  const all = [r.name, r.summary, ...r.contact, ...bullets, ...r.education.flatMap((e) => [e.school, e.degree, ...e.details]), ...r.skills.flatMap((g) => g.items)];
  const words = all.join(" ").split(/\s+/).filter(Boolean).length;
  const brackets = all.join(" ").match(/\[[^\]]+\]/g) || [];
  const thin = r.experiences.filter((e) => e.bullets.filter(Boolean).length < 2);
  return {
    words,
    checks: [
      { ok: r.contact.some((c) => c.includes("@")), text: "Has an email address" },
      { ok: r.education.length > 0, text: "Has an education section" },
      { ok: weak.length === 0, text: weak.length ? `${weak.length} bullet${weak.length > 1 ? "s start" : " starts"} weakly ("${weak[0].split(" ").slice(0, 3).join(" ")}…"). Start with an action verb like Built, Led or Analyzed.` : "Every bullet starts with an action verb" },
      { ok: long.length === 0, text: long.length ? `${long.length} bullet${long.length > 1 ? "s are" : " is"} over 28 words. Recruiters skim, so aim for one line.` : "Bullets are short enough to skim" },
      { ok: bullets.length === 0 || withNum.length / bullets.length >= 0.3, text: `${withNum.length} of ${bullets.length} bullets have a number. Numbers (people, %, time saved) make impact concrete, but only add real ones.` },
      { ok: thin.length === 0, text: thin.length ? `"${thin[0].title || thin[0].organization}" has fewer than 2 bullets.` : "Each experience has at least 2 bullets" },
      { ok: brackets.length === 0, text: brackets.length ? `Fill in ${brackets.slice(0, 3).join(", ")} before sending.` : "No [placeholders] left" },
      { ok: words <= 550, text: words <= 550 ? `About ${words} words, which fits on one page` : `About ${words} words, likely over one page. Students usually keep it to one.` },
    ],
  };
}

type Props = { profile: Profile | null; onUseProfile: (p: Profile) => void };

export default function ResumeBuilder({ profile, onUseProfile }: Props) {
  const [answers, setAnswers] = useState<BuilderAnswers>(EMPTY);
  const [resume, setResume] = useState<BuiltResume | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);

  // Restore and save the draft in this browser only.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s?.answers) setAnswers({ ...EMPTY, ...s.answers });
      if (s?.resume) setResume(s.resume);
      if (typeof s?.step === "number") setStep(s.step);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify({ answers, resume, step })); } catch {}
  }, [answers, resume, step, ready]);

  const set = (k: keyof BuilderAnswers) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setAnswers((a) => ({ ...a, [k]: e.target.value }));
  const setExp = (id: string, patch: Partial<BuilderExperience>) =>
    setAnswers((a) => ({ ...a, experiences: a.experiences.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const missing = !answers.name.trim() ? "Add your name on the first step." : "";

  async function generate() {
    if (missing) { setError(missing); setStep(0); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/build-resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not build the resume.");
      setResume(data.resume);
      bumpUsage("resumesBuilt");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function flash(msg: string) { setNote(msg); setTimeout(() => setNote(""), 2500); }

  if (resume) {
    return (
      <Editor
        resume={resume}
        onChange={setResume}
        busy={busy}
        error={error}
        note={note}
        onBack={() => { setResume(null); setStep(0); }}
        onRegenerate={generate}
        onCopy={async () => { await navigator.clipboard.writeText(builtResumeText(resume)); flash("Copied as plain text."); }}
        onUse={() => { onUseProfile(toProfile(resume, answers)); }}
      />
    );
  }

  const last = step === STEPS.length - 1;
  return (
    <section className="space-y-8">
      <div>
        <p className="kicker">Resume builder</p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">No resume yet? Answer a few questions.</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          Write the way you&apos;d explain it to a friend. AI turns your answers into resume bullets, using only what you tell it:
          no made-up numbers, tools or titles. You can edit every line afterwards. Your answers stay in this browser.
        </p>
        {profile && (
          <button onClick={() => { setAnswers(fromProfile(profile)); setStep(0); flash("Filled in from your uploaded resume."); }} className="btn-secondary mt-4">
            Start from my uploaded resume
          </button>
        )}
        {note && <p role="status" className="mt-2 text-sm text-emerald-700">{note}</p>}
      </div>

      {/* Progress */}
      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={`rounded-full border px-3 py-1 text-sm transition ${i === step ? "border-blue-600 bg-blue-600 text-white" : i < step ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}
            >
              {i < step ? "✓ " : `${i + 1}. `}{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-5 sm:p-7">
        {step === 0 && (
          <Grid>
            <F label="Full name *" ><input className="field" value={answers.name} onChange={set("name")} placeholder="Jordan Lee" autoComplete="name" /></F>
            <F label="Email"><input className="field" type="email" value={answers.email} onChange={set("email")} placeholder="you@school.edu" autoComplete="email" /></F>
            <F label="Phone" hint="optional"><input className="field" value={answers.phone} onChange={set("phone")} placeholder="(555) 123-4567" autoComplete="tel" /></F>
            <F label="City, State" hint="optional"><input className="field" value={answers.location} onChange={set("location")} placeholder="Austin, TX" /></F>
            <F label="Links" hint="LinkedIn, GitHub, portfolio, separated by commas" wide><input className="field" value={answers.links} onChange={set("links")} placeholder="linkedin.com/in/jordanlee, github.com/jlee" /></F>
          </Grid>
        )}

        {step === 1 && (
          <Grid>
            <F label="School"><input className="field" value={answers.school} onChange={set("school")} placeholder="University of Texas at Austin" /></F>
            <F label="Degree"><input className="field" value={answers.degree} onChange={set("degree")} placeholder="B.S., B.A., High school diploma…" /></F>
            <F label="Major or focus"><input className="field" value={answers.major} onChange={set("major")} placeholder="Computer Science" /></F>
            <F label="Graduation (expected)"><input className="field" value={answers.gradDate} onChange={set("gradDate")} placeholder="May 2028" /></F>
            <F label="GPA" hint="optional; many students list it if 3.0+"><input className="field" value={answers.gpa} onChange={set("gpa")} placeholder="3.7/4.0" /></F>
            <F label="Relevant coursework" hint="optional"><input className="field" value={answers.coursework} onChange={set("coursework")} placeholder="Data Structures, Statistics, Databases" /></F>
            <F label="Honors or awards" hint="optional" wide><input className="field" value={answers.honors} onChange={set("honors")} placeholder="Dean's List (2 semesters), 2nd place at a regional hackathon" /></F>
          </Grid>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              Jobs, internships, class or personal projects, hackathons, clubs, volunteering: anything counts. Add your strongest 2–5.
            </p>
            {answers.experiences.map((x, i) => (
              <fieldset key={x.id} className="rounded-md border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-800">Experience {i + 1}</legend>
                <Grid>
                  <F label="What kind?">
                    <select className="field" value={x.kind} onChange={(e) => setExp(x.id, { kind: e.target.value as ExperienceKind })}>
                      {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                  </F>
                  <F label="Your role or project name"><input className="field" value={x.role} onChange={(e) => setExp(x.id, { role: e.target.value })} placeholder="Software Intern / FAQ Chatbot" /></F>
                  <F label="Organization" hint="company, school, club or event"><input className="field" value={x.org} onChange={(e) => setExp(x.id, { org: e.target.value })} placeholder="City Library, CS 312, GWC Hackathon" /></F>
                  <F label="Location" hint="optional"><input className="field" value={x.location} onChange={(e) => setExp(x.id, { location: e.target.value })} placeholder="Remote" /></F>
                  <F label="Start"><input className="field" value={x.start} onChange={(e) => setExp(x.id, { start: e.target.value })} placeholder="Jun 2025" /></F>
                  <F label="End" hint="leave blank if ongoing"><input className="field" value={x.end} onChange={(e) => setExp(x.id, { end: e.target.value })} placeholder="Aug 2025" /></F>
                  <F label="What did you do?" hint="plain words are fine" wide>
                    <textarea className="field min-h-24" value={x.what} onChange={(e) => setExp(x.id, { what: e.target.value })} placeholder="I built a chatbot that answers common questions from new students. I collected the questions from our club's Discord and tested it with friends." />
                  </F>
                  <F label="Tools or skills you used" hint="comma separated"><input className="field" value={x.tools} onChange={(e) => setExp(x.id, { tools: e.target.value })} placeholder="Python, Flask, Gemini API" /></F>
                  <F label="Any results or numbers?" hint="only real ones; leave blank if unsure"><input className="field" value={x.results} onChange={(e) => setExp(x.id, { results: e.target.value })} placeholder="Used by about 200 students; won 2nd place" /></F>
                </Grid>
                {answers.experiences.length > 1 && (
                  <button onClick={() => setAnswers((a) => ({ ...a, experiences: a.experiences.filter((y) => y.id !== x.id) }))} className="mt-3 text-sm text-rose-700 hover:underline">
                    Remove this experience
                  </button>
                )}
              </fieldset>
            ))}
            {answers.experiences.length < 8 && (
              <button onClick={() => setAnswers((a) => ({ ...a, experiences: [...a.experiences, newExp()] }))} className="btn-secondary">＋ Add another experience</button>
            )}
          </div>
        )}

        {step === 3 && (
          <Grid>
            <F label="Skills" hint="comma separated; tools from your experiences are added automatically" wide>
              <textarea className="field min-h-20" value={answers.skills} onChange={set("skills")} placeholder="Python, JavaScript, SQL, Excel, Figma, Git" />
            </F>
            <F label="Languages you speak" hint="optional" wide><input className="field" value={answers.languages} onChange={set("languages")} placeholder="English (native), Spanish (conversational)" /></F>
          </Grid>
        )}

        {step === 4 && (
          <Grid>
            <F label="What kind of internship are you aiming for?" hint="helps the summary; optional" wide>
              <input className="field" value={answers.target} onChange={set("target")} placeholder="Software engineering, data analysis" />
            </F>
            <div className="sm:col-span-2 rounded-md bg-blue-50 px-4 py-3 text-sm text-slate-700">
              Ready? The AI writes your summary, bullets and skill groups. Your name, contact details, school and dates are copied exactly as you typed them,
              and any number or skill you didn&apos;t give is removed before you see the resume.
            </div>
          </Grid>
        )}

        {error && <p role="alert" className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-secondary">← Back</button>
          <span className="text-sm text-slate-500">Step {step + 1} of {STEPS.length}</span>
          {last ? (
            <button onClick={generate} disabled={busy} className="btn-primary">{busy ? "Writing your resume…" : "Build my resume →"}</button>
          ) : (
            <button onClick={() => setStep((s) => s + 1)} className="btn-primary">Next →</button>
          )}
        </div>
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function F({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="field-label">{label}{hint && <span className="ml-1 font-normal text-slate-400">({hint})</span>}</span>
      {children}
    </label>
  );
}

// ---------- Editor: every line editable, live preview, free checks ----------

type EditorProps = {
  resume: BuiltResume;
  onChange: (r: BuiltResume) => void;
  busy: boolean;
  error: string;
  note: string;
  onBack: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onUse: () => void;
};

function Editor({ resume: r, onChange, busy, error, note, onBack, onRegenerate, onCopy, onUse }: EditorProps) {
  const { checks, words } = useMemo(() => runChecks(r), [r]);
  const [used, setUsed] = useState(false);
  const upd = (patch: Partial<BuiltResume>) => onChange({ ...r, ...patch });
  const updExp = (i: number, patch: Partial<BuiltResume["experiences"][number]>) =>
    upd({ experiences: r.experiences.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const moveExp = (i: number, d: -1 | 1) => {
    const list = [...r.experiences];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    upd({ experiences: list });
  };
  const passed = checks.filter((c) => c.ok).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Resume builder</p>
          <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-slate-900">Your resume</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">Edit anything on the left; the page on the right updates as you type and is what you download.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => printBuiltResume(r)} className="btn-primary">⬇ Download PDF</button>
          <button onClick={onCopy} className="btn-secondary">Copy as text</button>
          <button onClick={() => { onUse(); setUsed(true); }} className="btn-secondary">{used ? "✓ Using for job search" : "Use it to find internships"}</button>
        </div>
      </div>
      {note && <p role="status" className="text-sm text-emerald-700">{note}</p>}
      {used && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved as your profile. Open the Search tab to see internships ranked for this resume.</p>}
      {error && <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [&>*]:min-w-0">
        {/* Left: fields */}
        <div className="space-y-5">
          <details open className="card p-4">
            <summary className="cursor-pointer font-semibold text-slate-900">Resume checks · {passed}/{checks.length}</summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {checks.map((c) => (
                <li key={c.text} className={`flex gap-2 ${c.ok ? "text-slate-600" : "text-amber-800"}`}>
                  <span aria-hidden>{c.ok ? "✓" : "!"}</span><span>{c.text}</span>
                </li>
              ))}
            </ul>
            {r.tips.length > 0 && (
              <>
                <p className="mt-4 text-sm font-semibold text-slate-800">Questions that would make it stronger</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-600">{r.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            )}
          </details>

          <div className="card space-y-3 p-4">
            <h2 className="font-semibold text-slate-900">Header</h2>
            <input className="field" aria-label="Name" value={r.name} onChange={(e) => upd({ name: e.target.value })} />
            <textarea className="field min-h-20" aria-label="Contact lines, one per line" value={r.contact.join("\n")} onChange={(e) => upd({ contact: e.target.value.split("\n") })} />
            <label className="block">
              <span className="field-label">Summary</span>
              <textarea className="field min-h-20" value={r.summary} onChange={(e) => upd({ summary: e.target.value })} />
            </label>
          </div>

          {r.education.map((ed, i) => (
            <div key={i} className="card space-y-3 p-4">
              <h2 className="font-semibold text-slate-900">Education</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="field" aria-label="School" value={ed.school} onChange={(e) => upd({ education: r.education.map((x, j) => (j === i ? { ...x, school: e.target.value } : x)) })} />
                <input className="field" aria-label="Date" value={ed.date} onChange={(e) => upd({ education: r.education.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} />
              </div>
              <input className="field" aria-label="Degree" value={ed.degree} onChange={(e) => upd({ education: r.education.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)) })} />
              <textarea className="field min-h-16" aria-label="Education details, one per line" value={ed.details.join("\n")} onChange={(e) => upd({ education: r.education.map((x, j) => (j === i ? { ...x, details: e.target.value.split("\n") } : x)) })} />
            </div>
          ))}

          {r.experiences.map((x, i) => (
            <div key={i} className="card space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Experience {i + 1}</h2>
                <div className="flex gap-1 text-sm">
                  <button onClick={() => moveExp(i, -1)} disabled={i === 0} className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up">↑</button>
                  <button onClick={() => moveExp(i, 1)} disabled={i === r.experiences.length - 1} className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down">↓</button>
                  <button onClick={() => upd({ experiences: r.experiences.filter((_, j) => j !== i) })} className="rounded px-2 py-1 text-rose-700 hover:bg-rose-50" aria-label="Delete experience">✕</button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="field" aria-label="Title" value={x.title} onChange={(e) => updExp(i, { title: e.target.value })} />
                <input className="field" aria-label="Organization" value={x.organization} onChange={(e) => updExp(i, { organization: e.target.value })} />
                <input className="field" aria-label="Location" placeholder="Location" value={x.location} onChange={(e) => updExp(i, { location: e.target.value })} />
                <input className="field" aria-label="Dates" placeholder="Dates" value={x.dates} onChange={(e) => updExp(i, { dates: e.target.value })} />
              </div>
              {x.bullets.map((b, k) => (
                <div key={k} className="flex gap-2">
                  <span className="pt-2 text-slate-400" aria-hidden>•</span>
                  <textarea
                    className="field min-h-14"
                    aria-label={`Bullet ${k + 1}`}
                    value={b}
                    onChange={(e) => updExp(i, { bullets: x.bullets.map((y, m) => (m === k ? e.target.value : y)) })}
                  />
                  <button onClick={() => updExp(i, { bullets: x.bullets.filter((_, m) => m !== k) })} className="self-start rounded px-2 py-2 text-sm text-slate-500 hover:bg-slate-100" aria-label="Delete bullet">✕</button>
                </div>
              ))}
              <button onClick={() => updExp(i, { bullets: [...x.bullets, ""] })} className="text-sm font-medium text-blue-700 hover:underline">＋ Add bullet</button>
            </div>
          ))}
          <button
            onClick={() => upd({ experiences: [...r.experiences, { kind: "project", title: "New experience", organization: "", location: "", dates: "", bullets: [""] }] })}
            className="btn-secondary"
          >
            ＋ Add experience
          </button>

          <div className="card space-y-3 p-4">
            <h2 className="font-semibold text-slate-900">Skills</h2>
            {r.skills.map((g, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
                <input className="field" aria-label="Group label" value={g.label} onChange={(e) => upd({ skills: r.skills.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} />
                <input className="field" aria-label="Skills, comma separated" value={g.items.join(", ")} onChange={(e) => upd({ skills: r.skills.map((y, j) => (j === i ? { ...y, items: e.target.value.split(/,\s*/) } : y)) })} />
                <button onClick={() => upd({ skills: r.skills.filter((_, j) => j !== i) })} className="rounded px-2 text-sm text-slate-500 hover:bg-slate-100" aria-label="Delete skill group">✕</button>
              </div>
            ))}
            <button onClick={() => upd({ skills: [...r.skills, { label: "Tools", items: [] }] })} className="text-sm font-medium text-blue-700 hover:underline">＋ Add skill group</button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={onBack} className="btn-secondary">← Edit my answers</button>
            <button onClick={() => { if (confirm("Rewrite the resume from your answers? Edits made here will be replaced.")) onRegenerate(); }} disabled={busy} className="btn-secondary">
              {busy ? "Rewriting…" : "↻ Rewrite from answers"}
            </button>
          </div>
        </div>

        {/* Right: live page preview */}
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <Preview r={r} />
          <p className="mt-2 text-xs text-slate-500">About {words} words · checks run in your browser, no AI.</p>
        </div>
      </div>
    </section>
  );
}

function Preview({ r }: { r: BuiltResume }) {
  return (
    <article aria-label="Resume preview" className="rounded-sm border border-slate-300 bg-white p-6 font-serif text-[12.5px] leading-snug text-neutral-900 shadow-sm sm:p-8">
      <h2 className="text-center text-2xl text-neutral-900">{r.name || "Your Name"}</h2>
      <p className="mt-1 break-words text-center text-[11.5px] text-neutral-600">{r.contact.filter(Boolean).join("  |  ")}</p>
      {r.summary && <><H>Summary</H><p>{r.summary}</p></>}
      {r.education.length > 0 && <H>Education</H>}
      {r.education.map((e, i) => (
        <div key={i} className="mb-1">
          <div className="flex justify-between gap-3"><b>{e.school}</b><i className="shrink-0 text-neutral-600">{e.date}</i></div>
          {e.degree && <div>{e.degree}</div>}
          {e.details.filter(Boolean).map((d, k) => <div key={k}>{d}</div>)}
        </div>
      ))}
      {r.experiences.length > 0 && <H>Experience</H>}
      {r.experiences.map((e, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between gap-3">
            <span><b>{e.title}</b>{e.organization && <>, {e.organization}</>}</span>
            <i className="shrink-0 text-neutral-600">{[e.location, e.dates].filter(Boolean).join(" · ")}</i>
          </div>
          <ul className="mt-0.5 list-disc pl-5">{e.bullets.filter(Boolean).map((b, k) => <li key={k}>{b}</li>)}</ul>
        </div>
      ))}
      {r.skills.length > 0 && <H>Skills</H>}
      {r.skills.map((g, i) => <div key={i}><b>{g.label}:</b> {g.items.filter(Boolean).join(", ")}</div>)}
    </article>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-3 border-b border-neutral-400 pb-0.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-neutral-900">{children}</h3>;
}
