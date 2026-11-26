import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { rateLimited } from "@/lib/rateLimit";
import { generateJSON } from "@/lib/gemini";
import type { NextStepsPlan, Opportunity, Profile } from "@/lib/types";
import { listedOnly, softenListedSkills, unlinkUnusedSkills } from "@/lib/honesty";

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
    suggestedEmail: { type: "string", enum: ["cover_letter", "outreach", "follow_up", "thank_you", "referral", "accept", "decline", "none"] },
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

// Date guard: a step's timing may only name a date the server gave the AI
// (today, the deadline, the interview, the follow-up day). "Before December 1"
// with no such deadline becomes "Soon".
const DATE_IN_TEXT = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s\d{1,2}\b/g;
function datedOnlyFromFacts(when: string, factText: string) {
  const w = String(when || "").slice(0, 60);
  const dates = w.match(DATE_IN_TEXT) || [];
  return dates.every((d) => factText.includes(d)) ? w : "Soon";
}
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

    // Skills that never show up in an experience are "listed", not "experience".
    const onlyListed = listedOnly(profile);

    // Dates the AI may use in a step's timing: ours, plus any the posting states.
    const factText = `${facts.join(" ")} ${o.description || ""}`;

    const prompt = `You are a practical internship coach. Write the next steps for ONE specific internship the student chose.

INTERNSHIP: ${o.title} at ${o.company} (${o.location})
POSTING LINK: ${o.url}
POSTING DETAILS: ${(o.description || "(only the title is known)").slice(0, 1500)}
STAGE: ${o.status}. ${STAGE_GOAL[o.status]}
${facts.join(" ")}
SKILLS ONLY IN THE SKILLS LIST (not shown in any experience): ${JSON.stringify(onlyListed)}
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
- Only mention the student's experience as it is written. Never link a skill to a project unless that project's bullets mention it (a skill in the skills list alone doesn't mean it was used in a given project). For anything in SKILLS ONLY IN THE SKILLS LIST, never say "experience", "your work with" or "projects using" it: call it a skill they list, and if it matters for this role, suggest showing it with a small project or a resume bullet. Never suggest they claim skills they don't have; for missing skills, suggest how to learn or show them honestly (a small project, a free course). Don't assume they are already learning something; say "if you start learning X, you can mention that" instead.
- Write to the student as "you". Be warm, direct and brief.`;

    const out = await generateJSON<Omit<NextStepsPlan, "status" | "generatedAt">>([{ text: prompt }], SCHEMA);
    // Honesty guards: no skill tied to an experience that didn't use it, no "experience" for listed-only skills.
    const clean = (t: string) => softenListedSkills(unlinkUnusedSkills(t, profile), onlyListed);
    const plan: NextStepsPlan = {
      headline: clean(out.headline || ""),
      steps: (out.steps || []).slice(0, 6).map((s) => ({
        title: clean(s.title),
        detail: clean(s.detail) || "Make sure your resume and application show this clearly, in your own words.",
        when: datedOnlyFromFacts(s.when, factText),
      })),
      prep: (out.prep || []).slice(0, 5).map(clean).filter(Boolean),
      suggestedEmail: out.suggestedEmail,
      status: o.status,
      generatedAt: today.toISOString(),
    };
    return NextResponse.json({ plan });
  } catch (err) {
    return fail(err);
  }
}
