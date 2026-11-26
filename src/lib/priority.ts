import type { Profile, ScoredJob } from "./types";
import { jobFacts } from "./jobFacts.ts";
import { keywordMatch } from "./keywords.ts";
import { gradWindow } from "./postingFacts.ts";

// Application Priority Engine: "what should I apply to first?" A plain,
// explainable score out of 100. Every point comes from a factor shown to the
// student; it's a way to order your list, not a prediction of getting hired.

export type Factor = { label: string; points: number; max: number; note: string };
export type Priority = { score: number; factors: Factor[]; warnings: string[] };

const DAY = 86_400_000;

export function priorityOf(job: ScoredJob, profile: Profile, now = Date.now()): Priority {
  const factors: Factor[] = [];
  const warnings: string[] = [];
  const facts = jobFacts(job);

  // 1. Match (40): the AI fit score if scored, else the free keyword match.
  const km = keywordMatch(job, profile);
  if (job.fit) factors.push({ label: "Match", points: Math.round(job.fit.score * 0.4), max: 40, note: `AI fit score ${job.fit.score}/100` });
  else if (km) factors.push({ label: "Match", points: Math.round(km.pct * 0.4), max: 40, note: `Keyword match ${km.pct}% (${km.matched.length} of ${km.matched.length + km.missing.length} skills)` });
  else factors.push({ label: "Match", points: 14, max: 40, note: "Not scored yet; use Score with AI for a real number" });

  // 2. Eligibility (20): a degree level named in the title (PhD, MBA, Master's)
  // that the resume doesn't show, then the posting's graduation window.
  const win = gradWindow(job);
  const year = Number(String(profile.graduationYear || "").match(/20\d\d/)?.[0]);
  const level = job.title.match(/\b(?:MS\s?\/\s?PhD|Ph\.?\s?D|MBA|Master'?s|M\.S\.|MS)\b/)?.[0];
  const resumeText = [profile.major, profile.school, ...profile.experiences.map((e) => e.title)].join(" ");
  const gradStudent = /\b(?:Ph\.?\s?D|doctoral|MBA|Master|M\.S\.|MS in|graduate student)\b/i.test(resumeText);
  if (level && !gradStudent) {
    const who = /mba/i.test(level) ? "MBA" : /ph/i.test(level) && !/ms/i.test(level) ? "PhD" : /ph/i.test(level) ? "Master's or PhD" : "Master's";
    factors.push({ label: "Eligibility", points: 3, max: 20, note: `Title says ${who} students; your resume doesn't show ${who} study` });
    warnings.push(`This internship is for ${who} students.`);
  } else if (win && year) {
    if (year >= win.from && year <= win.to) factors.push({ label: "Eligibility", points: 20, max: 20, note: `Your ${year} graduation fits what the posting asks for` });
    else {
      factors.push({ label: "Eligibility", points: 0, max: 20, note: `Posting asks for ${win.to === 9999 ? `${win.from} or later` : win.from === 0 ? `${win.to} or earlier` : win.from === win.to ? win.from : `${win.from}–${win.to}`} graduates; you graduate in ${year}` });
      warnings.push("Your graduation year may not fit this posting. Read its requirements before applying.");
    }
  } else factors.push({ label: "Eligibility", points: 14, max: 20, note: win ? "Add your graduation year to your profile to check" : "Posting doesn't state a graduation window" });

  // 3. Deadline (20): sooner deadlines first; passed ones drop out.
  if (job.deadline) {
    const days = Math.ceil((new Date(job.deadline).getTime() - now) / DAY);
    if (days < 0) {
      factors.push({ label: "Deadline", points: 0, max: 20, note: "Deadline has passed" });
      warnings.push("The listed deadline has passed.");
    } else factors.push({ label: "Deadline", points: days <= 7 ? 20 : days <= 21 ? 15 : 9, max: 20, note: `${days} day${days === 1 ? "" : "s"} left to apply` });
  } else factors.push({ label: "Deadline", points: 10, max: 20, note: "No deadline listed; roles like this often close early" });

  // 4. Freshness (10): early applicants get read first on rolling postings.
  if (job.postedAt) {
    const age = Math.floor((now - new Date(job.postedAt).getTime()) / DAY);
    factors.push({ label: "Freshness", points: age <= 7 ? 10 : age <= 30 ? 7 : age <= 90 ? 4 : 1, max: 10, note: age <= 0 ? "Posted today" : `Posted ${age} day${age === 1 ? "" : "s"} ago` });
  } else factors.push({ label: "Freshness", points: 4, max: 10, note: "Posting date unknown" });

  // 5. Pay listed (10): a stated pay range means fewer surprises.
  factors.push(facts.pay ? { label: "Pay listed", points: 10, max: 10, note: facts.pay } : { label: "Pay listed", points: 4, max: 10, note: "Pay not listed" });

  return { score: factors.reduce((n, f) => n + f.points, 0), factors, warnings };
}
