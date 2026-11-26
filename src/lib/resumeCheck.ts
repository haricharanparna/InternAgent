import type { Profile } from "./types.ts";

// Free resume check, like the "ATS / readability" checks in resume tools.
// Plain rules on the resume's own text, no AI: each finding quotes the bullet it's about.

export type Finding = { level: "fix" | "tip"; text: string; quote?: string };
export type ResumeCheck = { score: number; passed: string[]; findings: Finding[]; bullets: number };

const WEAK = /\b(responsible for|helped (with|to)?|worked on|assisted (with|in)|duties included|tasked with|involved in|participated in)\b/i;
const PRONOUN = /(^|[^a-z'])(i|me|my|we|our)(?![a-z'])/i;
const HAS_NUMBER = /\d/;
const VERB_END = /(ed|ing)$/i;
// Common strong openers that don't end in -ed.
const VERBS = new Set("built led ran won made wrote drove grew cut set began rebuilt taught sold shipped spearheaded".split(" "));
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const firstWord = (s: string) => (words(s)[0] || "").replace(/[^a-z-]/gi, "").toLowerCase();

export function checkResume(profile: Profile): ResumeCheck {
  const findings: Finding[] = [];
  const passed: string[] = [];
  const bullets = profile.experiences.flatMap((e) => e.bullets.map((b) => ({ b: b.trim(), where: e.title || e.organization })).filter((x) => x.b));

  // Contact and basics an applicant tracking system looks for.
  if (!/^\S+@\S+\.\S+$/.test(profile.email || "")) findings.push({ level: "fix", text: "Add an email address so recruiters (and applicant tracking systems) can reach you." });
  else passed.push("Email address found");
  if (!profile.school) findings.push({ level: "fix", text: "Add your school. Most internship filters check it." });
  if (!profile.graduationYear) findings.push({ level: "tip", text: "Add your graduation year. Many internships are only open to certain class years." });
  if (profile.school && profile.graduationYear) passed.push("School and graduation year listed");
  if (profile.skills.length < 5) findings.push({ level: "tip", text: `Only ${profile.skills.length} skill${profile.skills.length === 1 ? "" : "s"} listed. List the tools you can really use, so keyword filters find them.` });
  else passed.push(`${profile.skills.length} skills listed`);

  const empty = profile.experiences.filter((e) => !e.bullets.some((b) => b.trim()));
  for (const e of empty) findings.push({ level: "fix", text: `"${e.title || e.organization}" has no bullet points. Add 2–3 lines on what you did.` });
  if (!profile.experiences.length) findings.push({ level: "fix", text: "Add at least one experience: a job, class project, club or volunteer work all count." });

  // Bullet-level checks, at most 2 quoted examples each so the list stays short.
  const take = <T,>(list: T[]) => list.slice(0, 2);
  const weak = bullets.filter((x) => WEAK.test(x.b));
  for (const x of take(weak)) findings.push({ level: "fix", text: `Start with what you did, not "${x.b.match(WEAK)![0].toLowerCase()}". Lead with a verb like Built, Led or Analyzed.`, quote: x.b });
  const pron = bullets.filter((x) => PRONOUN.test(x.b));
  for (const x of take(pron)) findings.push({ level: "tip", text: "Resume bullets usually leave out \"I\", \"my\" and \"we\".", quote: x.b });
  const long = bullets.filter((x) => words(x.b).length > 35);
  for (const x of take(long)) findings.push({ level: "tip", text: `This bullet is ${words(x.b).length} words. Recruiters skim; aim for under 30.`, quote: x.b });
  const short = bullets.filter((x) => words(x.b).length < 5);
  for (const x of take(short)) findings.push({ level: "tip", text: "This bullet is very short. Say what you did and what came of it.", quote: x.b });
  const noVerb = bullets.filter((x) => !WEAK.test(x.b) && !PRONOUN.test(x.b) && !VERB_END.test(firstWord(x.b)) && !VERBS.has(firstWord(x.b)) && !/s$/.test(firstWord(x.b)));
  for (const x of take(noVerb)) findings.push({ level: "tip", text: "Try starting with an action verb (Built, Designed, Organized…).", quote: x.b });

  const counted = bullets.filter((x) => HAS_NUMBER.test(x.b)).length;
  if (bullets.length >= 3) {
    if (counted / bullets.length < 0.3) findings.push({ level: "tip", text: `${counted} of ${bullets.length} bullets have a number. Where it's true, add one: how many users, hours saved, people led, % improved.` });
    else passed.push(`${counted} of ${bullets.length} bullets show a number`);
  }
  const openers = new Map<string, number>();
  for (const x of bullets) { const w = firstWord(x.b); if (w) openers.set(w, (openers.get(w) || 0) + 1); }
  const repeated = [...openers.entries()].filter(([, n]) => n >= 3);
  for (const [w, n] of repeated) findings.push({ level: "tip", text: `${n} bullets start with "${w}". Vary the verbs so each line reads differently.` });
  if (bullets.length && !weak.length && !pron.length) passed.push("Bullets start with what you did");
  if (bullets.length && !long.length) passed.push("Bullets are easy to skim");

  const fixes = findings.filter((f) => f.level === "fix").length;
  const tips = findings.length - fixes;
  const score = Math.max(0, Math.min(100, 100 - fixes * 12 - tips * 5));
  return { score, passed, findings, bullets: bullets.length };
}
