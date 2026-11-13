import { NextResponse } from "next/server";
import { generateJSON } from "@/lib/gemini";
import type { Fit, Job, Profile } from "@/lib/types";

// Keep each request small so it stays inside Gemini's free tier.
const MAX_JOBS = 12;
const MAX_DESC = 1800;

const FIT_SCHEMA = {
  type: "object",
  properties: {
    fits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          matched: { type: "array", items: { type: "string" } },
          missing: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
        required: ["id", "score", "matched", "missing", "reason"],
      },
    },
  },
  required: ["fits"],
};

export async function POST(req: Request) {
  try {
    const { profile, jobs } = (await req.json()) as { profile: Profile; jobs: Job[] };
    const batch = jobs.slice(0, MAX_JOBS).map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      description: j.description.slice(0, MAX_DESC),
    }));

    const prompt = `You are an honest internship advisor. Score how well this student fits each posting.

STUDENT PROFILE:
${JSON.stringify(profile)}

POSTINGS:
${JSON.stringify(batch)}

For every posting return:
- score: 0-100, where 80+ means a strong application today and under 40 means a long shot. Be realistic, not flattering.
- matched: requirements the student clearly meets, based only on the profile (max 5, short phrases).
- missing: requirements the student does not show yet (max 5, short phrases).
- reason: one plain-English sentence explaining the score.
Never assume the student has a skill that is not in the profile.
Some postings only have a title and category. For those, judge from the title and category and keep "missing" to what the title clearly implies.`;

    const { fits } = await generateJSON<{ fits: Fit[] }>([{ text: prompt }], FIT_SCHEMA);
    return NextResponse.json({ fits });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
