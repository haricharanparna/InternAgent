import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import type { Job, Profile, TailoredResume } from "@/lib/types";

const MAX_DESC = 3500;

const TAILOR_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    bullets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          exp: { type: "integer" },
          bullet: { type: "integer" },
          tailored: { type: "string" },
          why: { type: "string" },
        },
        required: ["exp", "bullet", "tailored", "why"],
      },
    },
    gaps: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "skills", "bullets", "gaps"],
};

type ModelOutput = {
  summary: string;
  skills: string[];
  bullets: { exp: number; bullet: number; tailored: string; why: string }[];
  gaps: string[];
};

export async function POST(req: Request) {
  try {
    const { profile, job } = (await req.json()) as { profile: Profile; job: Job };

    // Number every bullet so the model edits wording only, never structure.
    const numbered = profile.experiences.map((e, exp) => ({
      exp,
      title: e.title,
      organization: e.organization,
      bullets: e.bullets.map((text, bullet) => ({ bullet, text })),
    }));

    const prompt = `You tailor a student's resume to one internship posting. Honesty is the top rule.

POSTING: ${job.title} at ${job.company}
${job.description.slice(0, MAX_DESC)}

STUDENT SKILLS: ${JSON.stringify(profile.skills)}
STUDENT EXPERIENCE (numbered): ${JSON.stringify(numbered)}

Return:
- summary: a 2-sentence professional summary aimed at this posting, using only facts above.
- skills: the student's skills reordered so the most relevant to the posting come first. Use ONLY skills from STUDENT SKILLS, spelled the same way.
- bullets: for EVERY bullet above, a rewritten version (keep its exp and bullet numbers). Lead with a strong verb, mirror the posting's wording where it is truthfully applicable, keep any numbers exactly as given.
  You may only REPHRASE. Every fact in the rewrite must be stated in that original bullet. Do NOT add tools, numbers, results, duties, or soft skills, and do not infer duties from a title (being "treasurer" does not prove "managed finances"). If a bullet can't be improved without adding facts, return it unchanged.
- why: a short note on what you changed and which posting requirement it targets.
- gaps: up to 5 requirements from the posting the student does not show. These are advice only.`;

    const out = await generateJSON<ModelOutput>([{ text: prompt }], TAILOR_SCHEMA);

    // Server-side honesty checks: drop any skill not in the profile, and
    // always take original bullets from the profile, not from the model.
    const known = new Map(profile.skills.map((s) => [s.toLowerCase(), s]));
    const skills = [...new Set(out.skills.map((s) => known.get(s.toLowerCase())).filter(Boolean) as string[])];
    for (const s of profile.skills) if (!skills.includes(s)) skills.push(s);

    const rewrites = new Map(out.bullets.map((b) => [`${b.exp}:${b.bullet}`, b]));
    const resume: TailoredResume = {
      summary: out.summary,
      skills,
      experiences: profile.experiences.map((e, exp) => ({
        title: e.title,
        organization: e.organization,
        bullets: e.bullets.map((original, bullet) => {
          const r = rewrites.get(`${exp}:${bullet}`);
          return { original, tailored: r?.tailored || original, why: r?.why || "Unchanged" };
        }),
      })),
      gaps: out.gaps.slice(0, 5),
    };
    return NextResponse.json({ resume });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
