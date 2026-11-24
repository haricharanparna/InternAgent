import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";
import type { BuilderAnswers, BuiltResume } from "@/lib/types";

// Turns the student's answers to the builder's questions into a resume.
// Code copies every fact (name, contact, school, dates); the AI only writes
// the summary, the bullets and the skill groups, and the server checks them.

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    experiences: {
      type: "array",
      items: {
        type: "object",
        properties: { index: { type: "integer" }, bullets: { type: "array", items: { type: "string" } } },
        required: ["index", "bullets"],
      },
    },
    skillGroups: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, items: { type: "array", items: { type: "string" } } },
        required: ["label", "items"],
      },
    },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "experiences", "skillGroups", "tips"],
};

type ModelOutput = {
  summary: string;
  experiences: { index: number; bullets: string[] }[];
  skillGroups: { label: string; items: string[] }[];
  tips: string[];
};

const clean = (s: unknown, max = 600) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const splitList = (s: string) =>
  s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

function dates(start: string, end: string) {
  if (start && end) return `${start} – ${end}`;
  return start ? `${start} – Present` : end;
}

// Fallback bullets if the model fails for one experience: the student's own sentences.
function ownSentences(e: BuilderAnswers["experiences"][number]) {
  return (e.what.match(/[^.!?\n]+[.!?]?/g) || []).map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 4);
}

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const { answers: raw } = (await req.json()) as { answers: BuilderAnswers };
    if (!raw?.name?.trim()) return NextResponse.json({ error: "Please add your name first." }, { status: 400 });

    const a: BuilderAnswers = {
      ...raw,
      experiences: (raw.experiences || []).slice(0, 8).filter((e) => clean(e.role) || clean(e.org) || clean(e.what)),
    };
    const exps = a.experiences.map((e, index) => ({
      index,
      kind: e.kind,
      // Present tense only for ongoing work: end says "Present", or a start date with no end.
      tense: /present|now|current/i.test(e.end || "") || (clean(e.start, 30) && !clean(e.end, 30)) ? "present" : "past",
      role: clean(e.role, 100),
      organization: clean(e.org, 100),
      whatTheyDid: clean(e.what, 1200),
      toolsUsed: clean(e.tools, 300),
      resultsOrNumbers: clean(e.results, 400),
    }));
    const listedSkills = [...splitList(clean(a.skills, 800)), ...a.experiences.flatMap((e) => splitList(clean(e.tools, 300)))];

    const prompt = `You are a careful university career-center advisor turning a student's own answers into a one-page internship resume.

STUDENT: ${JSON.stringify({ school: clean(a.school, 120), degree: clean(a.degree, 80), major: clean(a.major, 120), graduation: clean(a.gradDate, 40), coursework: clean(a.coursework, 400), honors: clean(a.honors, 400), target: clean(a.target, 200) })}
SKILLS THEY LISTED: ${JSON.stringify(listedSkills)}
LANGUAGES SPOKEN: ${clean(a.languages, 200) || "(none)"}
EXPERIENCES (numbered by index): ${JSON.stringify(exps)}

Return:
- summary: 1-2 plain sentences: who they are (year/major/school if given) and what they've done, aimed at ${clean(a.target, 120) || "internships in their field"}. No adjectives about personality.
- experiences: for EVERY index, 2-4 resume bullets. Each starts with a strong action verb in that experience's "tense" (past: Built, Analyzed; present: Build, Analyze), is one line (under 25 words), and has no "I", "my" or "responsible for".
- skillGroups: put every skill from SKILLS THEY LISTED into 2-4 groups with short labels such as "Languages", "Frameworks & Libraries", "Tools", "Data", "Design". Copy each skill's name exactly as written; don't add any skill.
- tips: 2-4 specific questions that would make THIS resume stronger, e.g. "How many students used the FAQ bot?" for a bullet with no number. Point at the exact experience.

Honesty rules (most important):
- Use only facts in the answers. Never invent numbers, percentages, users, awards, tools, team sizes or outcomes.
- A number may appear only if it appears in that experience's resultsOrNumbers or whatTheyDid.
- Never link a tool to an experience unless it's in that experience's toolsUsed or whatTheyDid.
- If the student worked in a team, say so ("with a team of 4") and describe only their own part as theirs.
- Don't add business words that aren't in the answers ("workflows", "stakeholders", "optimized", "streamlined").
- Don't upgrade the scale of the work ("a class project" stays a class project, "helped" doesn't become "led").`;

    const out = await generateJSON<ModelOutput>([{ text: prompt }], SCHEMA);

    // Skills guard: keep only skills the student actually listed, in their spelling.
    const byLower = new Map(listedSkills.map((s) => [s.toLowerCase(), s]));
    const used = new Set<string>();
    const skills = (out.skillGroups || [])
      .map((g) => ({
        label: clean(g.label, 40),
        items: (g.items || []).map((i) => byLower.get(String(i).trim().toLowerCase())).filter((i): i is string => !!i && !used.has(i.toLowerCase()) && !!used.add(i.toLowerCase())),
      }))
      .filter((g) => g.label && g.items.length);
    const leftover = [...byLower.values()].filter((s) => !used.has(s.toLowerCase()));
    if (leftover.length) skills.push({ label: skills.length ? "Other" : "Skills", items: leftover });
    if (clean(a.languages)) skills.push({ label: "Languages spoken", items: splitList(clean(a.languages, 200)) });

    const education = a.school?.trim()
      ? [{
          school: clean(a.school, 120),
          degree: [clean(a.degree, 80), clean(a.major, 120)].filter(Boolean).join(" in "),
          date: clean(a.gradDate, 40) ? `Expected ${clean(a.gradDate, 40)}` : "",
          details: [
            clean(a.gpa, 20) && `GPA: ${clean(a.gpa, 20)}`,
            clean(a.coursework, 400) && `Relevant coursework: ${clean(a.coursework, 400)}`,
            clean(a.honors, 400) && `Honors: ${clean(a.honors, 400)}`,
          ].filter(Boolean) as string[],
        }]
      : [];

    const resume: BuiltResume = {
      name: clean(a.name, 80),
      contact: [a.email, a.phone, a.location, ...splitList(clean(a.links, 300))].map((c) => clean(c, 120)).filter(Boolean),
      summary: clean(out.summary, 500),
      education,
      experiences: a.experiences.map((e, i) => {
        // Number guard: drop a bullet if it states a number the student never gave.
        const source = `${e.what} ${e.results} ${e.role} ${e.org}`;
        const ai = (out.experiences?.find((x) => x.index === i)?.bullets || [])
          .map((b) => clean(b, 300))
          .filter((b) => b && (b.match(/\d[\d,.]*/g) || []).every((n) => source.includes(n.replace(/[.,]$/, ""))));
        return {
          kind: e.kind,
          title: clean(e.role, 100),
          organization: clean(e.org, 100),
          location: clean(e.location, 80),
          dates: dates(clean(e.start, 30), clean(e.end, 30)),
          bullets: (ai.length ? ai : ownSentences(e)).slice(0, 4),
        };
      }),
      skills,
      tips: (out.tips || []).map((t) => clean(t, 200)).filter(Boolean).slice(0, 4),
    };
    return NextResponse.json({ resume });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
