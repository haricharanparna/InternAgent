import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";
import type { NextStepsPlan, Opportunity, Profile } from "@/lib/types";

// Builds a checklist of what to do next for ONE chosen internship, based on
// where the student is in the process (saved, applied, interview, ...).

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" }, when: { type: "string" } },
        required: ["title", "detail", "when"],
      },
    },
    prep: { type: "array", items: { type: "string" } },
    suggestedEmail: { type: "string", enum: ["outreach", "follow_up", "thank_you", "referral", "accept", "decline", "none"] },
  },
  required: ["headline", "steps", "prep", "suggestedEmail"],
};

const STAGE_GOAL: Record<Opportunity["status"], string> = {
  saved: "They have NOT applied yet. Focus on preparing a strong application and submitting it.",
  applied: "They have applied and are waiting. Focus on following up at the right time and preparing for a possible interview.",
  interview: "They have an interview. Focus on preparing for it and on what to do right after.",
  offer: "They have an offer. Focus on evaluating it, questions to ask, and responding professionally.",
  rejected: "They were not selected. Focus on closing the loop gracefully and what to improve for similar roles.",
};

const DAY = 86_400_000;
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export async function POST(req: Request) {
  const limited = rateLimited(req);
  if (limited) return limited;
  try {
    const { profile, opportunity: o } = (await req.json()) as { profile: Profile; opportunity: Opportunity };
    if (!profile || !o?.title) return NextResponse.json({ error: "Missing profile or opportunity." }, { status: 400 });

    // Dates are computed here, not by the model, so they're always right.
    const today = new Date();
    const facts: string[] = [`Today is ${fmt(today)}.`];
    if (o.appliedAt) {
      const applied = new Date(o.appliedAt);
      const days = Math.floor((today.getTime() - applied.getTime()) / DAY);
      facts.push(`They applied on ${fmt(applied)} (${days} day${days === 1 ? "" : "s"} ago).`);
      facts.push(`A polite follow-up is appropriate from ${fmt(new Date(applied.getTime() + 7 * DAY))} (7 days after applying).`);
    }
    if (o.deadline) {
      const d = new Date(o.deadline + "T23:59");
      const left = Math.ceil((d.getTime() - today.getTime()) / DAY);
      facts.push(left >= 0 ? `The student's application deadline is ${fmt(d)} (${left} day${left === 1 ? "" : "s"} from today).` : `The deadline the student noted (${fmt(d)}) has passed.`);
    }
    if (o.interviewAt) {
      const d = new Date(o.interviewAt);
      const left = Math.ceil((d.getTime() - today.getTime()) / DAY);
      facts.push(left >= 0 ? `The interview is on ${fmt(d)} (${left} day${left === 1 ? "" : "s"} from today). Plan prep backwards from that date.` : `The interview was on ${fmt(d)}; a thank-you note is due if not sent.`);
    }

    const prompt = `You are a practical internship coach. Write the next steps for ONE specific internship the student chose.

INTERNSHIP: ${o.title} at ${o.company} (${o.location})
POSTING LINK: ${o.url}
POSTING DETAILS: ${(o.description || "(only the title is known)").slice(0, 1500)}
STAGE: ${o.status}. ${STAGE_GOAL[o.status]}
${facts.join(" ")}
FIT: matched ${JSON.stringify(o.matched || [])}; missing ${JSON.stringify(o.missing || [])}
STUDENT NOTES: ${o.notes?.trim() || "(none)"}
STUDENT: ${JSON.stringify({ major: profile.major, school: profile.school, graduationYear: profile.graduationYear, skills: profile.skills, experiences: profile.experiences.map((e) => ({ title: e.title, organization: e.organization, bullets: e.bullets })) })}

Return:
- headline: one plain sentence on where they stand for THIS role and the single most important next move.
- steps: 4 to 6 concrete steps in order, each specific to this company and posting, not generic advice. title = short action, detail = 1-2 sentences on how (name the actual skills, projects or requirements involved), when = a short timing like "Today", "This week", "Before the interview", or a date from the facts above.
- prep: up to 5 specific things to study, practice or have ready, taken from the posting's requirements and the missing skills. Empty if nothing applies.
- suggestedEmail: the one email type that would help most right now, or "none".

Rules:
- Use only facts given above. Never invent deadlines, interview dates, recruiter names, salaries or company facts, and don't describe the hiring process (rolling deadlines, number of rounds) unless POSTING DETAILS says it. If no deadline is given, say to apply soon because roles can close early.
- Only mention the student's experience as it is written. Never link a skill to a project unless that project's bullets mention it (a skill in the skills list alone doesn't mean it was used in a given project). Never suggest they claim skills they don't have; for missing skills, suggest how to learn or show them honestly (a small project, a course, saying they are learning it).
- Write to the student as "you". Be warm, direct and brief.`;

    const out = await generateJSON<Omit<NextStepsPlan, "status" | "generatedAt">>([{ text: prompt }], SCHEMA);
    const plan: NextStepsPlan = {
      ...out,
      steps: out.steps.slice(0, 6),
      prep: out.prep.slice(0, 5),
      status: o.status,
      generatedAt: today.toISOString(),
    };
    return NextResponse.json({ plan });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
